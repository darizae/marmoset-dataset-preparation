import { DatasetManifest } from '../types';
import { TrialSet } from '../trialTypes';
import { BundleParseResult } from './bundleTypes';
import {
    assertSafeInternalPath,
    validateDatasetMetaShape,
    validateManifestShape,
    validateTrialSetShape
} from './bundleValidation';

function inferRootLabel(files: File[]): string {
    if (!files.length) return 'bundle';
    const anyFile = files[0] as any;
    const rel = typeof anyFile.webkitRelativePath === 'string' ? anyFile.webkitRelativePath : files[0].name;
    if (!rel || !rel.includes('/')) return rel || 'bundle';
    return rel.split('/')[0];
}

function getInternalPath(file: File, rootLabel: string): string {
    const anyFile = file as any;
    const rel = typeof anyFile.webkitRelativePath === 'string' ? (anyFile.webkitRelativePath as string) : file.name;
    if (!rel) return file.name;
    if (rel === rootLabel) return file.name;
    const prefix = `${rootLabel}/`;
    const trimmed = rel.startsWith(prefix) ? rel.slice(prefix.length) : rel;
    return trimmed;
}

function buildFileIndex(files: File[], rootLabel: string): Map<string, File> {
    const map = new Map<string, File>();
    for (const file of files) {
        const p = getInternalPath(file, rootLabel);
        assertSafeInternalPath(p);
        if (map.has(p)) {
            throw new Error(`Duplicate file path in selected folder: "${p}"`);
        }
        map.set(p, file);
    }
    return map;
}

async function readJsonFile(file: File): Promise<unknown> {
    const text = await file.text();
    return JSON.parse(text);
}

function collectTrialSetPaths(fileIndex: Map<string, File>): { subjectId: string; trialsJsonPath: string }[] {
    const out: { subjectId: string; trialsJsonPath: string }[] = [];
    for (const p of fileIndex.keys()) {
        if (!p.startsWith('trial_sets/')) continue;
        if (!p.endsWith('/trials.json')) continue;
        const parts = p.split('/');
        if (parts.length !== 3) continue;
        const subjectId = parts[1];
        if (!subjectId) continue;
        out.push({ subjectId, trialsJsonPath: p });
    }
    out.sort((a, b) => a.subjectId.localeCompare(b.subjectId));
    return out;
}

function validateMediaPresence(trialSets: Record<string, TrialSet>, mediaByInternalPath: Map<string, File>): void {
    for (const [subjectId, ts] of Object.entries(trialSets)) {
        for (const t of ts.trials) {
            const paths = [t.audio.path, t.leftImage.path, t.rightImage.path];
            for (const p of paths) {
                assertSafeInternalPath(p);
                if (!mediaByInternalPath.has(p)) {
                    throw new Error(`Bundle media missing for subject "${subjectId}": "${p}"`);
                }
            }
        }
    }
}

export async function parseBundleFromDirectorySelection(files: File[]): Promise<BundleParseResult> {
    if (!files.length) {
        throw new Error('No files selected.');
    }

    const bundleRootLabel = inferRootLabel(files);
    const fileIndex = buildFileIndex(files, bundleRootLabel);

    const datasetMetaFile = fileIndex.get('dataset_meta.json');
    if (!datasetMetaFile) throw new Error('Bundle is missing dataset_meta.json at the root.');

    const manifestFile = fileIndex.get('manifest.json');
    if (!manifestFile) throw new Error('Bundle is missing manifest.json at the root.');

    const datasetMetaRaw = await readJsonFile(datasetMetaFile);
    const datasetMeta = validateDatasetMetaShape(datasetMetaRaw);

    const manifestRaw = await readJsonFile(manifestFile);
    const manifest: DatasetManifest = validateManifestShape(manifestRaw);

    const trialSetPaths = collectTrialSetPaths(fileIndex);
    if (!trialSetPaths.length) throw new Error('Bundle has no trial_sets/<subject_id>/trials.json entries.');

    const trialSets: Record<string, TrialSet> = {};
    for (const { subjectId, trialsJsonPath } of trialSetPaths) {
        const f = fileIndex.get(trialsJsonPath);
        if (!f) throw new Error(`Missing trials.json for subject "${subjectId}".`);
        const raw = await readJsonFile(f);
        const ts = validateTrialSetShape(raw);
        if (ts.meta.subjectId !== subjectId) {
            throw new Error(`Trial set subject mismatch: folder "${subjectId}" but trials.json meta.subjectId is "${ts.meta.subjectId}".`);
        }
        trialSets[subjectId] = ts;
    }

    const mediaByInternalPath = new Map<string, File>();
    for (const [p, f] of fileIndex.entries()) {
        if (p.startsWith('media/images/') || p.startsWith('media/audio/')) {
            mediaByInternalPath.set(p, f);
        }
    }

    validateMediaPresence(trialSets, mediaByInternalPath);

    return {
        bundleRootLabel,
        datasetMeta,
        manifest,
        trialSets,
        mediaByInternalPath
    };
}
