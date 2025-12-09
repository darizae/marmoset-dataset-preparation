import {
    BuildDatasetResult,
    CsvIdentityRow,
    DatasetManifest,
    DatasetWarning,
    Exemplar,
    FileError,
    IdentityDatasetEntry
} from './types';

function getRelativePath(file: File): string {
    const anyFile = file as any;
    if (typeof anyFile.webkitRelativePath === 'string' && anyFile.webkitRelativePath.length > 0) {
        return anyFile.webkitRelativePath as string;
    }
    return file.name;
}

function parseBaseAndExt(fileName: string): { base: string; extLower: string } {
    const idx = fileName.lastIndexOf('.');
    if (idx === -1) {
        return { base: fileName, extLower: '' };
    }
    const base = fileName.slice(0, idx);
    const ext = fileName.slice(idx + 1);
    return { base, extLower: ext.toLowerCase() };
}

const BASE_PATTERN = /^([A-Za-z]+)(\d+)$/;

export interface BuildDatasetOptions {
    csvRows: CsvIdentityRow[];
    dataDirLabel: string;
    files: File[];
    expectedImages: number;
    expectedAudios: number;
}

/**
 * Core dataset-building logic:
 * - maps media files to IDs from CSV
 * - enforces naming conventions
 * - computes exemplar counts
 * - produces warnings and file errors
 */
export function buildDatasetManifest(options: BuildDatasetOptions): BuildDatasetResult {
    const { csvRows, dataDirLabel, files, expectedImages, expectedAudios } = options;

    const warnings: DatasetWarning[] = [];
    const fileErrors: FileError[] = [];

    const csvIdentities = new Set(csvRows.map((r) => String(r.ID).trim()));

    const imageMap = new Map<string, Exemplar[]>();
    const audioMap = new Map<string, Exemplar[]>();

    for (const file of files) {
        const relativePath = getRelativePath(file);
        const fileName = file.name;
        const { base, extLower } = parseBaseAndExt(fileName);

        const isImage = extLower === 'jpg' || extLower === 'jpeg';
        const isAudio = extLower === 'wav';

        if (!isImage && !isAudio) {
            continue;
        }

        const match = BASE_PATTERN.exec(base);
        if (!match) {
            fileErrors.push({
                fileName,
                relativePath,
                message:
                    'File name does not follow required convention "<ID><index>.EXT" where ID is letters only and index is digits, e.g. "A1.jpg" or "Odin3.wav".'
            });
            continue;
        }

        const identity = match[1];
        const idx = Number.parseInt(match[2], 10);

        if (!Number.isFinite(idx)) {
            fileErrors.push({
                fileName,
                relativePath,
                message: 'Index part of file name is not a valid integer.'
            });
            continue;
        }

        if (!csvIdentities.has(identity)) {
            warnings.push({
                type: 'media',
                message: `Media file "${relativePath}" refers to ID "${identity}" which is not present in data_info.csv. This file will be ignored in the manifest.`,
                identityId: identity
            });
            continue;
        }

        const targetMap = isImage ? imageMap : audioMap;
        const list = targetMap.get(identity) || [];
        if (list.some((ex) => ex.index === idx)) {
            fileErrors.push({
                fileName,
                relativePath,
                message: `Duplicate exemplar index ${idx} for ID "${identity}". Each exemplar index must be unique per identity.`
            });
            continue;
        }

        list.push({ index: idx, relativePath, fileName });
        targetMap.set(identity, list);
    }

    // Sort exemplars by index
    for (const arr of imageMap.values()) {
        arr.sort((a, b) => a.index - b.index);
    }
    for (const arr of audioMap.values()) {
        arr.sort((a, b) => a.index - b.index);
    }

    const infoColumns = new Set<string>();
    csvRows.forEach((r) => {
        Object.keys(r).forEach((k) => {
            if (k !== 'ID') infoColumns.add(k);
        });
    });

    const identities: IdentityDatasetEntry[] = [];

    for (const id of Array.from(csvIdentities).sort()) {
        const rowsForId = csvRows.filter((r) => String(r.ID).trim() === id);
        const baseRow = rowsForId[0];

        const properties: { [key: string]: any } = {};
        infoColumns.forEach((col) => {
            const v = baseRow[col];
            if (v === undefined || v === null || v === '') {
                properties[col] = null;
            } else {
                properties[col] = v;
            }
        });

        const imageExemplars = imageMap.get(id) || [];
        const audioExemplars = audioMap.get(id) || [];

        const nImages = imageExemplars.length;
        const nAudios = audioExemplars.length;

        const hasEnoughImages = nImages >= expectedImages;
        const hasEnoughAudios = nAudios >= expectedAudios;

        if (!hasEnoughImages) {
            warnings.push({
                type: 'identity',
                message: `ID "${id}" is missing image exemplars: expected at least ${expectedImages}, found ${nImages}.`,
                identityId: id
            });
        }
        if (!hasEnoughAudios) {
            warnings.push({
                type: 'identity',
                message: `ID "${id}" is missing audio exemplars: expected at least ${expectedAudios}, found ${nAudios}.`,
                identityId: id
            });
        }
        if (nImages === 0 && nAudios === 0) {
            warnings.push({
                type: 'identity',
                message: `ID "${id}" has no media files at all (no JPG and no WAV files).`,
                identityId: id
            });
        }

        identities.push({
            id,
            properties,
            nImageExemplars: nImages,
            nAudioExemplars: nAudios,
            hasEnoughImages,
            hasEnoughAudios,
            expectedMinImages: expectedImages,
            expectedMinAudios: expectedAudios,
            imageExemplars,
            audioExemplars
        });
    }

    const manifest: DatasetManifest = {
        meta: {
            dataDirLabel,
            expected_n_images: expectedImages,
            expected_n_audios: expectedAudios
        },
        identities
    };

    return { manifest, warnings, fileErrors };
}
