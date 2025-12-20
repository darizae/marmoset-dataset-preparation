import React from 'react';
import { DatasetManifest, IdentityDatasetEntry } from '../../domain/types';

interface Props {
    manifest: DatasetManifest | null;
}

function downloadBlob(content: Blob, filename: string) {
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function stringifyManifest(manifest: DatasetManifest): string {
    return JSON.stringify(manifest, null, 2);
}

function manifestToCsv(manifest: DatasetManifest): string {
    const entries = manifest.identities;

    const propertyKeys = new Set<string>();
    entries.forEach((e) => {
        Object.keys(e.properties).forEach((k) => propertyKeys.add(k));
    });

    const propCols = Array.from(propertyKeys);

    const header = [
        'ID',
        'n_image_exemplars',
        'n_audio_exemplars',
        'has_enough_images',
        'has_enough_audios',
        'expected_min_images',
        'expected_min_audios',
        'image_paths',
        'audio_paths',
        ...propCols
    ];

    const rows: string[] = [];
    rows.push(header.join(','));

    function escapeCsv(value: any): string {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (/[",\n]/.test(str)) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    entries.forEach((e: IdentityDatasetEntry) => {
        const imagePaths = e.imageExemplars.map((ex) => ex.relativePath).join('|');
        const audioPaths = e.audioExemplars.map((ex) => ex.relativePath).join('|');

        const baseCols = [
            e.id,
            e.nImageExemplars,
            e.nAudioExemplars,
            e.hasEnoughImages,
            e.hasEnoughAudios,
            e.expectedMinImages,
            e.expectedMinAudios,
            imagePaths,
            audioPaths
        ];

        const propValues = propCols.map((col) =>
            e.properties[col] !== undefined ? e.properties[col] : ''
        );

        const all = [...baseCols, ...propValues].map(escapeCsv);
        rows.push(all.join(','));
    });

    return rows.join('\n');
}

const ExportPanel: React.FC<Props> = ({ manifest }) => {
    const handleExportJson = async () => {
        if (!manifest) return;
        const jsonStr = stringifyManifest(manifest);
        const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
        downloadBlob(blob, 'dataset_manifest.json');
    };

    const handleExportCsv = async () => {
        if (!manifest) return;
        const csvStr = manifestToCsv(manifest);
        const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8' });
        downloadBlob(blob, 'dataset_manifest.csv');
    };

    return (
        <div className="inline-input-row">
            <button className="button" onClick={handleExportJson} disabled={!manifest}>
                Download JSON manifest
            </button>
            <button className="button" onClick={handleExportCsv} disabled={!manifest}>
                Download CSV summary
            </button>
            {!manifest && (
                <span className="small-text">Run processing first to generate a manifest.</span>
            )}
        </div>
    );
};

export default ExportPanel;
