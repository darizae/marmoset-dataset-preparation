import JSZip from 'jszip';
import { DatasetManifest, IdentityDatasetEntry } from '../types';
import { TrialConfig, TrialSet } from '../trialTypes';
import { createRng, pickOne } from '../rng';
import { generateTrials } from '../trialGenerator';
import { BundleInMemory, BundleSeedPolicy, DatasetMeta } from './bundleTypes';
import {
    assertSafeInternalPath,
    fileNameFromPath,
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

function buildMediaIndexByFileName(files: File[]): Map<string, File[]> {
    const map = new Map<string, File[]>();
    for (const f of files) {
        const list = map.get(f.name) || [];
        list.push(f);
        map.set(f.name, list);
    }
    return map;
}

function findUniqueFileByName(index: Map<string, File[]>, fileName: string): File {
    const list = index.get(fileName) || [];
    if (list.length === 0) throw new Error(`Missing media file: "${fileName}"`);
    if (list.length > 1) throw new Error(`Duplicate media filename detected (must be unique in bundle): "${fileName}"`);
    return list[0];
}

export function normalizeManifestToBundlePaths(manifest: DatasetManifest): DatasetManifest {
    const identities = manifest.identities.map((e) => {
        const nextImages = e.imageExemplars.map((ex) => ({
            ...ex,
            relativePath: normalizeBundleImagePath(ex.fileName)
        }));
        const nextAudios = e.audioExemplars.map((ex) => ({
            ...ex,
            relativePath: normalizeBundleAudioPath(ex.fileName)
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
        const audioFileName = fileNameFromPath(t.audio.path);
        const leftFileName = fileNameFromPath(t.leftImage.path);
        const rightFileName = fileNameFromPath(t.rightImage.path);

        const audioPath = normalizeBundleAudioPath(audioFileName);
        const leftPath = normalizeBundleImagePath(leftFileName);
        const rightPath = normalizeBundleImagePath(rightFileName);

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
        const ts = generateTrials(manifest, subjectId, cfg);
        out[subjectId] = normalizeTrialSetToBundlePaths(ts);
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
    normalizedManifest: DatasetManifest,
    trialSets: Record<string, TrialSet>,
    mediaIndexByFileName: Map<string, File[]>
): Map<string, File> {
    const neededInternalPathToFile = new Map<string, File>();

    for (const idEntry of normalizedManifest.identities) {
        for (const ex of idEntry.imageExemplars) {
            assertSafeInternalPath(ex.relativePath);
            const f = findUniqueFileByName(mediaIndexByFileName, ex.fileName);
            neededInternalPathToFile.set(ex.relativePath, f);
        }
        for (const ex of idEntry.audioExemplars) {
            assertSafeInternalPath(ex.relativePath);
            const f = findUniqueFileByName(mediaIndexByFileName, ex.fileName);
            neededInternalPathToFile.set(ex.relativePath, f);
        }
    }

    for (const [subjectId, ts] of Object.entries(trialSets)) {
        for (const t of ts.trials) {
            const refs = [
                { kind: 'audio', path: t.audio.path, fileName: fileNameFromPath(t.audio.path) },
                { kind: 'leftImage', path: t.leftImage.path, fileName: fileNameFromPath(t.leftImage.path) },
                { kind: 'rightImage', path: t.rightImage.path, fileName: fileNameFromPath(t.rightImage.path) }
            ];
            for (const r of refs) {
                assertSafeInternalPath(r.path);
                const f = findUniqueFileByName(mediaIndexByFileName, r.fileName);
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

    const mediaIndexByFileName = buildMediaIndexByFileName(datasetFiles);
    const mediaByInternalPath = validateMediaReferencesStrict(normalizedManifest, trialSets, mediaIndexByFileName);

    const subjects = Object.keys(trialSets).sort();
    const counts = buildCounts(trialSets);

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
        trialSets,
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

export function suggestOverridesFromSelection(subjectIds: string[], globalSeed: string): Record<string, string> {
    const rng = createRng(`${globalSeed}::overrides`);
    const out: Record<string, string> = {};
    for (const sid of subjectIds) {
        const shouldPreFill = rng.next() < 0.0;
        if (shouldPreFill) {
            out[sid] = pickOne([`${globalSeed}::${sid}`], rng);
        }
    }
    return out;
}
