import { DatasetManifest, Exemplar } from '../types';
import { TrialSet } from '../trialTypes';
import { DatasetMeta } from './bundleTypes';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function assertSafeInternalPath(path: string): void {
    if (!path) throw new Error('Empty path is not allowed.');
    if (path.startsWith('/') || path.startsWith('\\')) throw new Error(`Absolute paths are not allowed: "${path}"`);
    if (path.includes('\\')) throw new Error(`Backslashes are not allowed in bundle paths: "${path}"`);
    const parts = path.split('/');
    for (const part of parts) {
        if (!part.length) throw new Error(`Invalid path segment in "${path}".`);
        if (part === '.' || part === '..') throw new Error(`Path traversal is not allowed: "${path}"`);
    }
}

export function fileNameFromPath(path: string): string {
    const idx = path.lastIndexOf('/');
    return idx === -1 ? path : path.slice(idx + 1);
}

export function normalizeBundleImagePath(fileName: string): string {
    return `media/images/${fileName}`;
}

export function normalizeBundleAudioPath(fileName: string): string {
    return `media/audio/${fileName}`;
}

export function validateDatasetMetaShape(meta: unknown): DatasetMeta {
    if (!isRecord(meta)) throw new Error('dataset_meta.json must be a JSON object.');
    const dataset_id = String(meta.dataset_id || '').trim();
    const created_at = String(meta.created_at || '').trim();
    const source_data_dir_label = String(meta.source_data_dir_label || '').trim();
    const subjectsRaw = meta.subjects;
    if (!dataset_id) throw new Error('dataset_meta.json: dataset_id is required.');
    if (!created_at) throw new Error('dataset_meta.json: created_at is required.');
    if (!source_data_dir_label) throw new Error('dataset_meta.json: source_data_dir_label is required.');
    if (!Array.isArray(subjectsRaw)) throw new Error('dataset_meta.json: subjects must be an array.');
    const subjects = subjectsRaw.map((s) => String(s)).filter((s) => s.length > 0);

    const seed_policy = meta.seed_policy as any;
    const generator_config = meta.generator_config as any;
    const counts = meta.counts as any;

    if (!isRecord(seed_policy)) throw new Error('dataset_meta.json: seed_policy must be an object.');
    if (!isRecord(generator_config)) throw new Error('dataset_meta.json: generator_config must be an object.');
    if (!isRecord(counts)) throw new Error('dataset_meta.json: counts must be an object.');

    return {
        dataset_id,
        created_at,
        source_data_dir_label,
        subjects,
        seed_policy: seed_policy as any,
        generator_config: generator_config as any,
        counts: counts as any
    };
}

export function validateManifestShape(manifest: unknown): DatasetManifest {
    if (!isRecord(manifest)) throw new Error('manifest.json must be a JSON object.');
    const meta = manifest.meta;
    const identities = manifest.identities;
    if (!isRecord(meta)) throw new Error('manifest.json: meta must be an object.');
    if (!Array.isArray(identities)) throw new Error('manifest.json: identities must be an array.');
    for (const idEntry of identities) {
        if (!isRecord(idEntry)) throw new Error('manifest.json: invalid identity entry.');
        const id = String(idEntry.id || '').trim();
        if (!id) throw new Error('manifest.json: identity.id is required.');
        const imageExemplars = idEntry.imageExemplars;
        const audioExemplars = idEntry.audioExemplars;
        if (!Array.isArray(imageExemplars) || !Array.isArray(audioExemplars)) {
            throw new Error(`manifest.json: identity "${id}" exemplars must be arrays.`);
        }
        const validateExemplar = (ex: unknown, kind: 'image' | 'audio'): Exemplar => {
            if (!isRecord(ex)) throw new Error(`manifest.json: identity "${id}" has invalid ${kind} exemplar.`);
            const relativePath = String(ex.relativePath || '');
            assertSafeInternalPath(relativePath);
            return {
                index: Number(ex.index) || 0,
                relativePath,
                fileName: String(ex.fileName || '')
            };
        };
        imageExemplars.forEach((ex) => validateExemplar(ex, 'image'));
        audioExemplars.forEach((ex) => validateExemplar(ex, 'audio'));
    }
    return manifest as DatasetManifest;
}

export function validateTrialSetShape(trialSet: unknown): TrialSet {
    if (!isRecord(trialSet)) throw new Error('trials.json must be a JSON object.');
    if (!isRecord(trialSet.meta)) throw new Error('trials.json: meta must be an object.');
    if (!Array.isArray(trialSet.trials)) throw new Error('trials.json: trials must be an array.');

    const subjectId = String((trialSet.meta as any).subjectId || '').trim();
    if (!subjectId) throw new Error('trials.json: meta.subjectId is required.');

    for (const t of trialSet.trials) {
        if (!isRecord(t)) throw new Error(`trials.json: invalid trial entry for subject "${subjectId}".`);
        const audioPath = String((t as any).audio?.path || '');
        const leftPath = String((t as any).leftImage?.path || '');
        const rightPath = String((t as any).rightImage?.path || '');
        assertSafeInternalPath(audioPath);
        assertSafeInternalPath(leftPath);
        assertSafeInternalPath(rightPath);
    }

    return trialSet as TrialSet;
}
