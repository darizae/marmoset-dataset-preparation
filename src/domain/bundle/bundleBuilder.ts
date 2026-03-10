import JSZip from 'jszip';
import { DatasetManifest, IdentityDatasetEntry } from '../types';
import { TrialConfig, TrialSet } from '../trialTypes';
import { generateTrials } from '../trialGenerator';
import { BundleInMemory, BundleSeedPolicy, DatasetMeta } from './bundleTypes';
import {
    assertSafeInternalPath,
    normalizeBundleAudioPath,
    normalizeBundleImagePath
} from './bundleValidation';
import { trialSetToCsv } from './trialsCsv';

function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function isFocalIdentity(entry: IdentityDatasetEntry): boolean {
    const focalRaw = entry.properties?.focal;
    const s = String(focalRaw ?? '').trim().toLowerCase();
    return s === '1' || s === 'true';
}

export function listDefaultSubjectIds(manifest: DatasetManifest): string[] {
    const focal = manifest.identities.filter(isFocalIdentity).map((e) => e.id);
    return focal.length ? focal : manifest.identities.map((e) => e.id);
}

export function deriveSubjectSeed(seedPolicy: BundleSeedPolicy, subjectId: string): string {
    if (seedPolicy.strategy === 'per_subject') {
        const s = seedPolicy.perSubjectSeeds[subjectId];
        if (!s) throw new Error(`Missing per-subject seed for "${subjectId}".`);
        return s;
    }
    const override = seedPolicy.perSubjectOverrides[subjectId];
    if (override && override.trim().length > 0) return override.trim();
    if (!seedPolicy.globalSeed || seedPolicy.globalSeed.trim().length === 0) {
        throw new Error('Global seed is required.');
    }
    return `${seedPolicy.globalSeed}::${subjectId}`;
}

export function buildSeedPolicyGlobal(globalSeed: string, overrides: Record<string, string>): BundleSeedPolicy {
    return {
        strategy: 'global',
        globalSeed,
        perSubjectOverrides: overrides
    };
}

export function buildSeedPolicyPerSubject(perSubjectSeeds: Record<string, string>): BundleSeedPolicy {
    return {
        strategy: 'per_subject',
        perSubjectSeeds
    };
}

function getRelativePath(file: File): string {
    const fileWithRelativePath = file as File & { webkitRelativePath?: string };
    if (typeof fileWithRelativePath.webkitRelativePath === 'string' && fileWithRelativePath.webkitRelativePath.length > 0) {
        return fileWithRelativePath.webkitRelativePath;
    }
    return file.name;
}

function buildMediaIndexByRelativePath(files: File[]): Map<string, File> {
    const map = new Map<string, File>();
    for (const f of files) {
        const relativePath = getRelativePath(f);
        if (map.has(relativePath)) {
            throw new Error(`Duplicate media path detected: "${relativePath}"`);
        }
        map.set(relativePath, f);
    }
    return map;
}

function findUniqueFileByRelativePath(index: Map<string, File>, relativePath: string): File {
    const file = index.get(relativePath);
    if (!file) throw new Error(`Missing media file: "${relativePath}"`);
    return file;
}

export function normalizeManifestToBundlePaths(manifest: DatasetManifest): DatasetManifest {
    const identities = manifest.identities.map((e) => {
        const nextImages = e.imageExemplars.map((ex) => ({
            ...ex,
            relativePath: normalizeBundleImagePath(ex.relativePath, manifest.meta.dataDirLabel)
        }));
        const nextAudios = e.audioExemplars.map((ex) => ({
            ...ex,
            relativePath: normalizeBundleAudioPath(ex.relativePath, manifest.meta.dataDirLabel)
        }));
        return {
            ...e,
            imageExemplars: nextImages,
            audioExemplars: nextAudios
        };
    });
    return {
        meta: { ...manifest.meta },
        identities
    };
}

export function normalizeTrialSetToBundlePaths(trialSet: TrialSet): TrialSet {
    const trials = trialSet.trials.map((t) => {
        const audioPath = normalizeBundleAudioPath(t.audio.path, trialSet.meta.dataDirLabel);
        const leftPath = normalizeBundleImagePath(t.leftImage.path, trialSet.meta.dataDirLabel);
        const rightPath = normalizeBundleImagePath(t.rightImage.path, trialSet.meta.dataDirLabel);

        assertSafeInternalPath(audioPath);
        assertSafeInternalPath(leftPath);
        assertSafeInternalPath(rightPath);

        return {
            ...t,
            audio: { ...t.audio, path: audioPath },
            leftImage: { ...t.leftImage, path: leftPath },
            rightImage: { ...t.rightImage, path: rightPath }
        };
    });

    return {
        meta: { ...trialSet.meta },
        trials
    };
}

export function generateMultiSubjectTrials(
    manifest: DatasetManifest,
    selectedSubjectIds: string[],
    baseConfig: Omit<TrialConfig, 'seed'>,
    seedPolicy: BundleSeedPolicy
): Record<string, TrialSet> {
    const out: Record<string, TrialSet> = {};
    for (const subjectId of selectedSubjectIds) {
        const seed = deriveSubjectSeed(seedPolicy, subjectId);
        const cfg: TrialConfig = { ...baseConfig, seed };
        out[subjectId] = generateTrials(manifest, subjectId, cfg);
    }
    return out;
}

function buildCounts(trialSets: Record<string, TrialSet>): { overallTrials: number; perSubjectTrials: Record<string, number> } {
    const perSubjectTrials: Record<string, number> = {};
    let overallTrials = 0;
    for (const [subjectId, ts] of Object.entries(trialSets)) {
        const n = ts.trials.length;
        perSubjectTrials[subjectId] = n;
        overallTrials += n;
    }
    return { overallTrials, perSubjectTrials };
}

function validateMediaReferencesStrict(
    manifest: DatasetManifest,
    normalizedManifest: DatasetManifest,
    sourceTrialSets: Record<string, TrialSet>,
    trialSets: Record<string, TrialSet>,
    mediaIndexByRelativePath: Map<string, File>
): Map<string, File> {
    const neededInternalPathToFile = new Map<string, File>();
    const sourceIdentities = new Map(manifest.identities.map((identity) => [identity.id, identity]));

    for (const idEntry of normalizedManifest.identities) {
        const sourceIdentity = sourceIdentities.get(idEntry.id);
        if (!sourceIdentity) {
            throw new Error(`Missing source manifest identity: "${idEntry.id}"`);
        }
        for (const ex of idEntry.imageExemplars) {
            assertSafeInternalPath(ex.relativePath);
            const sourceExemplar = sourceIdentity.imageExemplars.find((source) => source.index === ex.index);
            if (!sourceExemplar) {
                throw new Error(`Missing source image exemplar for "${idEntry.id}" index ${ex.index}.`);
            }
            const f = findUniqueFileByRelativePath(mediaIndexByRelativePath, sourceExemplar.relativePath);
            neededInternalPathToFile.set(ex.relativePath, f);
        }
        for (const ex of idEntry.audioExemplars) {
            assertSafeInternalPath(ex.relativePath);
            const sourceExemplar = sourceIdentity.audioExemplars.find((source) => source.index === ex.index);
            if (!sourceExemplar) {
                throw new Error(`Missing source audio exemplar for "${idEntry.id}" index ${ex.index}.`);
            }
            const f = findUniqueFileByRelativePath(mediaIndexByRelativePath, sourceExemplar.relativePath);
            neededInternalPathToFile.set(ex.relativePath, f);
        }
    }

    for (const [subjectId, ts] of Object.entries(trialSets)) {
        const sourceTrialSet = sourceTrialSets[subjectId];
        if (!sourceTrialSet) {
            throw new Error(`Missing source trial set for "${subjectId}".`);
        }
        for (const t of ts.trials) {
            const sourceTrial = sourceTrialSet.trials.find((trial) => trial.trialId === t.trialId);
            if (!sourceTrial) {
                throw new Error(`Missing source trial "${t.trialId}" for subject "${subjectId}".`);
            }
            const refs = [
                { path: t.audio.path, sourcePath: sourceTrial.audio.path },
                { path: t.leftImage.path, sourcePath: sourceTrial.leftImage.path },
                { path: t.rightImage.path, sourcePath: sourceTrial.rightImage.path }
            ];
            for (const r of refs) {
                assertSafeInternalPath(r.path);
                const f = findUniqueFileByRelativePath(mediaIndexByRelativePath, r.sourcePath);
                neededInternalPathToFile.set(r.path, f);
            }
        }
        if (!ts.trials.length) {
            throw new Error(`Subject "${subjectId}" produced zero trials, which is not allowed for bundle creation.`);
        }
    }

    return neededInternalPathToFile;
}

export function buildBundleInMemory(
    datasetId: string,
    sourceDataDirLabel: string,
    manifest: DatasetManifest,
    trialSets: Record<string, TrialSet>,
    seedPolicy: BundleSeedPolicy,
    generatorConfig: Omit<TrialConfig, 'seed'>,
    datasetFiles: File[]
): BundleInMemory {
    const created_at = new Date().toISOString();
    const normalizedManifest = normalizeManifestToBundlePaths(manifest);
    const normalizedTrialSets = Object.fromEntries(
        Object.entries(trialSets).map(([subjectId, trialSet]) => [subjectId, normalizeTrialSetToBundlePaths(trialSet)])
    );

    const mediaIndexByRelativePath = buildMediaIndexByRelativePath(datasetFiles);
    const mediaByInternalPath = validateMediaReferencesStrict(
        manifest,
        normalizedManifest,
        trialSets,
        normalizedTrialSets,
        mediaIndexByRelativePath
    );

    const subjects = Object.keys(normalizedTrialSets).sort();
    const counts = buildCounts(normalizedTrialSets);

    const datasetMeta: DatasetMeta = {
        dataset_id: datasetId,
        created_at,
        source_data_dir_label: sourceDataDirLabel,
        subjects,
        seed_policy: seedPolicy,
        generator_config: generatorConfig,
        counts
    };

    return {
        datasetMeta,
        manifest: normalizedManifest,
        trialSets: normalizedTrialSets,
        mediaByInternalPath
    };
}

export async function buildBundleZipBlob(bundle: BundleInMemory): Promise<Blob> {
    const zip = new JSZip();

    zip.file('dataset_meta.json', JSON.stringify(bundle.datasetMeta, null, 2));
    zip.file('manifest.json', JSON.stringify(bundle.manifest, null, 2));

    for (const subjectId of Object.keys(bundle.trialSets).sort()) {
        const ts = bundle.trialSets[subjectId];
        zip.file(`trial_sets/${subjectId}/trials.json`, JSON.stringify(ts, null, 2));
        zip.file(`trial_sets/${subjectId}/trials.csv`, trialSetToCsv(ts));
    }

    for (const [internalPath, file] of bundle.mediaByInternalPath.entries()) {
        assertSafeInternalPath(internalPath);
        zip.file(internalPath, file);
    }

    return zip.generateAsync({ type: 'blob' });
}

export async function downloadBundleZip(bundle: BundleInMemory, fileNameBase: string): Promise<void> {
    const blob = await buildBundleZipBlob(bundle);
    const safeBase = fileNameBase.trim().length > 0 ? fileNameBase.trim() : 'marmoset_bundle';
    downloadBlob(blob, `${safeBase}.zip`);
}

export function chooseDefaultDatasetId(sourceLabel: string): string {
    const s = sourceLabel.trim();
    return s.length ? s : 'dataset';
}
