import Papa from 'papaparse';
import { DatasetManifest, Exemplar, IdentityDatasetEntry } from './types';

const BASE_PATTERN = /^([A-Za-z]+)(\d+)$/;

function parseBaseAndExt(fileName: string): { base: string; extLower: string } {
    const idx = fileName.lastIndexOf('.');
    if (idx === -1) {
        return { base: fileName, extLower: '' };
    }
    const base = fileName.slice(0, idx);
    const ext = fileName.slice(idx + 1);
    return { base, extLower: ext.toLowerCase() };
}

function fileNameFromPath(p: string): string {
    const idx = p.lastIndexOf('/');
    if (idx === -1) return p;
    return p.slice(idx + 1);
}

function parseIndexFromPath(p: string): number | null {
    const fn = fileNameFromPath(p);
    const { base } = parseBaseAndExt(fn);
    const match = BASE_PATTERN.exec(base);
    if (!match) return null;
    const idx = Number.parseInt(match[2], 10);
    return Number.isFinite(idx) ? idx : null;
}

function toNumberOrNull(v: any): number | null {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return v;
    const s = String(v).trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}

function toBooleanOrNull(v: any): boolean | null {
    if (v === null || v === undefined) return null;
    if (typeof v === 'boolean') return v;
    const s = String(v).trim().toLowerCase();
    if (!s) return null;
    if (s === 'true') return true;
    if (s === 'false') return false;
    return null;
}

function toStringOrNull(v: any): string | null {
    if (v === null || v === undefined) return null;
    const s = String(v);
    if (s === 'NA') return null;
    return s;
}

function parseExemplarsFromPaths(pathsStr: string | null | undefined): Exemplar[] {
    if (!pathsStr) return [];
    const parts = String(pathsStr)
        .split('|')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    const exemplars: Exemplar[] = [];
    for (const p of parts) {
        const idx = parseIndexFromPath(p);
        const fileName = fileNameFromPath(p);
        if (idx !== null) {
            exemplars.push({ index: idx, relativePath: p, fileName });
        }
    }
    exemplars.sort((a, b) => a.index - b.index);
    return exemplars;
}

export async function parsePreparedManifestFromJsonFile(file: File): Promise<DatasetManifest> {
    const text = await file.text();
    const obj = JSON.parse(text);
    const manifest: DatasetManifest = {
        meta: {
            dataDirLabel: toStringOrNull(obj?.meta?.dataDirLabel) || 'dataset',
            expected_n_images: Number(obj?.meta?.expected_n_images) || 0,
            expected_n_audios: Number(obj?.meta?.expected_n_audios) || 0
        },
        identities: []
    };
    const src = Array.isArray(obj?.identities) ? obj.identities : [];
    for (const r of src) {
        const id = String(r?.id || '').trim();
        if (!id) continue;
        const props = typeof r?.properties === 'object' && r?.properties !== null ? r.properties : {};
        const images = Array.isArray(r?.imageExemplars)
            ? r.imageExemplars.map((e: any) => ({
                index: Number(e?.index) || 0,
                relativePath: String(e?.relativePath || ''),
                fileName: String(e?.fileName || '')
            }))
            : [];
        const audios = Array.isArray(r?.audioExemplars)
            ? r.audioExemplars.map((e: any) => ({
                index: Number(e?.index) || 0,
                relativePath: String(e?.relativePath || ''),
                fileName: String(e?.fileName || '')
            }))
            : [];
        images.sort((a, b) => a.index - b.index);
        audios.sort((a, b) => a.index - b.index);
        const entry: IdentityDatasetEntry = {
            id,
            properties: props,
            nImageExemplars: images.length,
            nAudioExemplars: audios.length,
            hasEnoughImages: Boolean(r?.hasEnoughImages),
            hasEnoughAudios: Boolean(r?.hasEnoughAudios),
            expectedMinImages: Number(r?.expectedMinImages) || 0,
            expectedMinAudios: Number(r?.expectedMinAudios) || 0,
            imageExemplars: images,
            audioExemplars: audios
        };
        manifest.identities.push(entry);
    }
    return manifest;
}

export async function parsePreparedManifestFromCsvFile(file: File): Promise<DatasetManifest> {
    const text = await file.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    if (parsed.errors && parsed.errors.length > 0) {
        const msg = parsed.errors.map((e) => e.message).join('; ');
        throw new Error(`CSV parse error(s): ${msg}`);
    }
    const rows = parsed.data as any[];
    const cols = parsed.meta.fields || [];
    const baseCols = new Set([
        'ID',
        'n_image_exemplars',
        'n_audio_exemplars',
        'has_enough_images',
        'has_enough_audios',
        'expected_min_images',
        'expected_min_audios',
        'image_paths',
        'audio_paths'
    ]);
    const propCols = cols.filter((c) => !baseCols.has(c));
    const identities: IdentityDatasetEntry[] = [];
    for (const r of rows) {
        const id = String(r['ID'] || '').trim();
        if (!id) continue;
        const images = parseExemplarsFromPaths(r['image_paths']);
        const audios = parseExemplarsFromPaths(r['audio_paths']);
        const props: { [key: string]: any } = {};
        for (const c of propCols) {
            const v = r[c];
            const num = toNumberOrNull(v);
            const bool = toBooleanOrNull(v);
            if (bool !== null) {
                props[c] = bool;
            } else if (num !== null) {
                props[c] = num;
            } else {
                props[c] = toStringOrNull(v);
            }
        }
        identities.push({
            id,
            properties: props,
            nImageExemplars: images.length,
            nAudioExemplars: audios.length,
            hasEnoughImages: Boolean(r['has_enough_images'] === true || String(r['has_enough_images']).toLowerCase() === 'true'),
            hasEnoughAudios: Boolean(r['has_enough_audios'] === true || String(r['has_enough_audios']).toLowerCase() === 'true'),
            expectedMinImages: Number(r['expected_min_images']) || 0,
            expectedMinAudios: Number(r['expected_min_audios']) || 0,
            imageExemplars: images,
            audioExemplars: audios
        });
    }
    const manifest: DatasetManifest = {
        meta: {
            dataDirLabel: 'prepared_dataset',
            expected_n_images: 0,
            expected_n_audios: 0
        },
        identities
    };
    return manifest;
}

export async function parsePreparedManifestFromFile(file: File): Promise<DatasetManifest> {
    const name = file.name.toLowerCase();
    if (name.endsWith('.json')) {
        return parsePreparedManifestFromJsonFile(file);
    }
    if (name.endsWith('.csv')) {
        return parsePreparedManifestFromCsvFile(file);
    }
    throw new Error('Unsupported file type. Provide the prepared JSON or CSV file produced by preprocessing.');
}
