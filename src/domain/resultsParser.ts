import Papa from 'papaparse';
import { ConditionLabel, ParsedResultFile, ResultRow, deriveCondition, Side } from './resultsTypes';

function toBool(v: any): boolean | undefined {
    if (v === null || v === undefined || v === '') return undefined;
    if (typeof v === 'boolean') return v;
    const s = String(v).trim().toLowerCase();
    if (s === 'true') return true;
    if (s === 'false') return false;
    return undefined;
}

function toNumber(v: any): number | undefined {
    if (v === null || v === undefined || v === '') return undefined;
    if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
    const s = String(v).trim();
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
}

function toSide(v: any): Side | undefined {
    const s = String(v || '').trim().toLowerCase();
    if (s === 'left' || s === 'right') return s as Side;
    return undefined;
}

function toOutcome(v: any): 'correct' | 'incorrect' | undefined {
    const s = String(v || '').trim().toLowerCase();
    if (s === 'correct' || s === 'incorrect') return s as any;
    return undefined;
}

function normalizeRow(obj: any): ResultRow {
    // Required minimal fields
    const subject_id = String(obj.subject_id || '').trim();
    const trial_id = String(obj.trial_id || '').trim();
    const trial_number = toNumber(obj.trial_number);

    const is_partner_call = toBool(obj.is_partner_call);
    const call_categoryRaw = String(obj.call_category || '').trim().toLowerCase();
    const call_category = call_categoryRaw === 'familiar' || call_categoryRaw === 'unfamiliar'
        ? (call_categoryRaw as 'familiar' | 'unfamiliar')
        : undefined;

    if (!subject_id) throw new Error('Missing subject_id');
    if (!trial_id) throw new Error('Missing trial_id');
    if (trial_number === undefined) throw new Error('Missing or invalid trial_number');
    if (is_partner_call === undefined) throw new Error('Missing or invalid is_partner_call');

    const outcome = toOutcome(obj.outcome);
    const chosen_side = toSide(obj.chosen_side);
    const correct_side = toSide(obj.correct_side);
    const aborted = toBool(obj.aborted);
    const timeout = toBool(obj.timeout);

    const latency_sec = toNumber(obj.latency_sec);
    const session_id = obj.session_id !== undefined ? String(obj.session_id) : undefined;

    const row: ResultRow = {
        subject_id,
        session_id,
        trial_id,
        trial_number,
        outcome,
        chosen_side,
        correct_side,
        is_partner_call,
        call_category,
        call_identity_id: obj.call_identity_id ? String(obj.call_identity_id) : undefined,
        other_identity_id: obj.other_identity_id ? String(obj.other_identity_id) : undefined,
        partner_id: obj.partner_id ? String(obj.partner_id) : undefined,
        latency_sec,
        choice_time: toNumber(obj.choice_time),
        timestamp: toNumber(obj.timestamp),
        trial_start_time: toNumber(obj.trial_start_time),
        aborted,
        timeout,
        audio_identity_id: obj.audio_identity_id ? String(obj.audio_identity_id) : undefined,
        audio_index: toNumber(obj.audio_index),
        audio_path: obj.audio_path ? String(obj.audio_path) : undefined,
        left_image_identity_id: obj.left_image_identity_id ? String(obj.left_image_identity_id) : undefined,
        left_image_index: toNumber(obj.left_image_index),
        left_image_path: obj.left_image_path ? String(obj.left_image_path) : undefined,
        right_image_identity_id: obj.right_image_identity_id ? String(obj.right_image_identity_id) : undefined,
        right_image_index: toNumber(obj.right_image_index),
        right_image_path: obj.right_image_path ? String(obj.right_image_path) : undefined,
        choice_x: toNumber(obj.choice_x),
        choice_y: toNumber(obj.choice_y)
    };

    // derived condition
    row.condition = deriveCondition(row.is_partner_call, row.call_category);

    // derived correctness if outcome missing
    if (row.outcome === 'correct') row.is_correct = true;
    else if (row.outcome === 'incorrect') row.is_correct = false;
    else if (row.chosen_side && row.correct_side) row.is_correct = row.chosen_side === row.correct_side;
    else row.is_correct = null;

    return row;
}

function computeEligibility(row: ResultRow): boolean {
    const aborted = row.aborted === true;
    const timeout = row.timeout === true;
    return !aborted && !timeout;
}

export async function parseResultsCsv(file: File): Promise<ParsedResultFile> {
    const text = await file.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    const errors: string[] = [];
    if (parsed.errors && parsed.errors.length > 0) {
        errors.push(...parsed.errors.map((e) => `CSV parse error: ${e.message}`));
    }
    const rowsRaw: any[] = (parsed.data as any[]) || [];
    const rows: ResultRow[] = [];
    const rowErrors: string[] = [];
    for (let i = 0; i < rowsRaw.length; i++) {
        const r = rowsRaw[i];
        try {
            const nr = normalizeRow(r);
            rows.push(nr);
        } catch (err: any) {
            rowErrors.push(`Row ${i + 1}: ${err?.message || String(err)}`);
        }
    }
    const totalRows = rowsRaw.length;
    const eligibleRows = rows.filter(computeEligibility).length;
    const subjects = Array.from(new Set(rows.map((r) => r.subject_id))).sort();
    const sessionIds = Array.from(new Set(rows.map((r) => String(r.session_id || '')).filter((x) => x))).sort();

    const warnings: string[] = [];
    if (rowErrors.length > 0) {
        warnings.push(`${rowErrors.length} rows failed validation in ${file.name}. See details below.`);
    }
    // warn if multiple subjects per file
    if (subjects.length > 1) {
        warnings.push(`Multiple subject_ids detected in ${file.name}: ${subjects.join(', ')}`);
    }

    return {
        fileName: file.name,
        format: 'csv',
        rows,
        totalRows,
        eligibleRows,
        subjects,
        sessionIds,
        errors,
        warnings: [...warnings, ...rowErrors]
    };
}

export async function parseResultsJsonl(file: File): Promise<ParsedResultFile> {
    const text = await file.text();
    const lines = text.split(/\r?\n/);
    const rows: ResultRow[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const ln = lines[i].trim();
        if (!ln) continue;
        let obj: any;
        try {
            obj = JSON.parse(ln);
        } catch (err: any) {
            errors.push(`Line ${i + 1}: JSON parse error: ${err?.message || String(err)}`);
            continue;
        }
        try {
            const nr = normalizeRow(obj);
            rows.push(nr);
        } catch (err: any) {
            warnings.push(`Line ${i + 1}: ${err?.message || String(err)}`);
        }
    }

    const totalRows = lines.filter((ln) => ln.trim().length > 0).length;
    const eligibleRows = rows.filter((r) => !r.aborted && !r.timeout).length;
    const subjects = Array.from(new Set(rows.map((r) => r.subject_id))).sort();
    const sessionIds = Array.from(new Set(rows.map((r) => String(r.session_id || '')).filter((x) => x))).sort();

    if (subjects.length > 1) {
        warnings.push(`Multiple subject_ids detected in ${file.name}: ${subjects.join(', ')}`);
    }

    return {
        fileName: file.name,
        format: 'jsonl',
        rows,
        totalRows,
        eligibleRows,
        subjects,
        sessionIds,
        errors,
        warnings
    };
}
