import React from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { TrialSet, Trial } from '../domain/trialTypes';

interface Props {
    trialSet: TrialSet | null;
}

function isTauriEnvironment(): boolean {
    if (typeof window === 'undefined') return false;
    const w = window as any;
    return !!(w.__TAURI__ || w.__TAURI_INTERNALS__);
}

function downloadBlob(content: Blob, filename: string) {
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function stringifyJson(trialSet: TrialSet): string {
    return JSON.stringify(trialSet, null, 2);
}

function escapeCsv(value: any): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function trialsToCsv(trialSet: TrialSet): string {
    const header = [
        'trial_id',
        'trial_number',
        'subject_id',
        'partner_id',
        'call_identity_id',
        'call_category',
        'is_partner_call',
        'other_identity_id',
        'other_category',
        'partner_side',
        'correct_side',
        'audio_identity_id',
        'audio_index',
        'audio_path',
        'left_image_identity_id',
        'left_image_index',
        'left_image_path',
        'right_image_identity_id',
        'right_image_index',
        'right_image_path',
        'seed'
    ];
    const rows: string[] = [];
    rows.push(header.join(','));
    for (const t of trialSet.trials) {
        const cols = [
            t.trialId,
            t.trialNumber,
            t.subjectId,
            t.partnerId,
            t.callIdentityId,
            t.callCategory,
            t.isPartnerCall,
            t.otherIdentityId,
            t.otherCategory,
            t.partnerSide,
            t.correctSide,
            t.audio.identityId,
            t.audio.exemplarIndex,
            t.audio.path,
            t.leftImage.identityId,
            t.leftImage.exemplarIndex,
            t.leftImage.path,
            t.rightImage.identityId,
            t.rightImage.exemplarIndex,
            t.rightImage.path,
            t.seed
        ].map(escapeCsv);
        rows.push(cols.join(','));
    }
    return rows.join('\n');
}

const TrialExportPanel: React.FC<Props> = ({ trialSet }) => {
    const handleExportJson = async () => {
        if (!trialSet) return;
        const jsonStr = stringifyJson(trialSet);
        if (isTauriEnvironment()) {
            try {
                const filePath = await save({
                    defaultPath: 'trials.json',
                    filters: [{ name: 'JSON file', extensions: ['json'] }]
                });
                if (!filePath) return;
                await writeTextFile(filePath, jsonStr);
            } catch {
                alert('Error during Tauri JSON export.');
            }
        } else {
            const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
            downloadBlob(blob, 'trials.json');
        }
    };

    const handleExportCsv = async () => {
        if (!trialSet) return;
        const csvStr = trialsToCsv(trialSet);
        if (isTauriEnvironment()) {
            try {
                const filePath = await save({
                    defaultPath: 'trials.csv',
                    filters: [{ name: 'CSV file', extensions: ['csv'] }]
                });
                if (!filePath) return;
                await writeTextFile(filePath, csvStr);
            } catch {
                alert('Error during Tauri CSV export.');
            }
        } else {
            const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8' });
            downloadBlob(blob, 'trials.csv');
        }
    };

    return (
        <div className="inline-input-row">
            <button className="button" onClick={handleExportJson} disabled={!trialSet}>
                Download trials JSON
            </button>
            <button className="button" onClick={handleExportCsv} disabled={!trialSet}>
                Download trials CSV
            </button>
            {!trialSet && <span className="small-text">Generate trials first.</span>}
        </div>
    );
};

export default TrialExportPanel;
