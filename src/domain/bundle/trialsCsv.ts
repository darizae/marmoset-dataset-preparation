import { TrialSet } from '../trialTypes';

function escapeCsv(value: unknown): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

export function trialSetToCsv(trialSet: TrialSet): string {
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
