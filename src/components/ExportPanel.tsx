import React from 'react';
import { DatasetManifest, IdentityDatasetEntry } from '../domain/types';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

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

function isTauriEnvironment(): boolean {
    if (typeof window === 'undefined') return false;
    const w = window as any;
    return !!(w.__TAURI__ || w.__TAURI_INTERNALS__);
}

const ExportPanel: React.FC<Props> = ({ manifest }) => {
    const handleExportJson = async () => {
        if (!manifest) return;
        const jsonStr = stringifyManifest(manifest);

        console.log('[Export] Export JSON clicked. isTauriEnvironment =', isTauriEnvironment());

        if (isTauriEnvironment()) {
            try {
                const filePath = await save({
                    defaultPath: 'dataset_manifest.json',
                    filters: [{ name: 'JSON file', extensions: ['json'] }]
                });

                console.log('[Export] save() returned path:', filePath);

                if (!filePath) {
                    console.log('[Export] User cancelled JSON save dialog.');
                    return;
                }

                await writeTextFile(filePath, jsonStr);
                console.log('[Export] JSON written to', filePath);
            } catch (err) {
                console.error('[Export] Error during Tauri JSON export:', err);
                alert('Error during Tauri JSON export. See console for details.');
            }
        } else {
            console.log('[Export] Not in Tauri, using browser download for JSON.');
            const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
            downloadBlob(blob, 'dataset_manifest.json');
        }
    };

    const handleExportCsv = async () => {
        if (!manifest) return;
        const csvStr = manifestToCsv(manifest);

        console.log('[Export] Export CSV clicked. isTauriEnvironment =', isTauriEnvironment());

        if (isTauriEnvironment()) {
            try {
                const filePath = await save({
                    defaultPath: 'dataset_manifest.csv',
                    filters: [{ name: 'CSV file', extensions: ['csv'] }]
                });

                if (!filePath) {
                    console.log('[Export] User cancelled CSV save dialog.');
                    return;
                }

                await writeTextFile(filePath, csvStr);
            } catch (err) {
                console.error('[Export] Error during Tauri CSV export:', err);
            }
        } else {
            const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8' });
            downloadBlob(blob, 'dataset_manifest.csv');
        }
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
