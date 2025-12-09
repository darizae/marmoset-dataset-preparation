export type Side = 'left' | 'right';

export type ConditionLabel = 'partner' | 'familiar_non_partner' | 'unfamiliar' | 'unknown';

export interface ResultRow {
    subject_id: string;
    session_id?: string | number;
    trial_id: string;
    trial_number: number;

    // correctness and selection
    outcome?: 'correct' | 'incorrect';
    chosen_side?: Side;
    correct_side?: Side;

    // core experimental fields
    is_partner_call: boolean;
    call_category?: 'familiar' | 'unfamiliar';
    call_identity_id?: string;
    other_identity_id?: string;
    partner_id?: string;

    // timing
    latency_sec?: number;
    choice_time?: number;
    timestamp?: number;
    trial_start_time?: number;

    // status flags
    aborted?: boolean;
    timeout?: boolean;

    // optional stimulus identity/index/path fields
    audio_identity_id?: string;
    audio_index?: number;
    audio_path?: string;
    left_image_identity_id?: string;
    left_image_index?: number;
    left_image_path?: string;
    right_image_identity_id?: string;
    right_image_index?: number;
    right_image_path?: string;

    // coordinates (optional)
    choice_x?: number;
    choice_y?: number;

    // convenience: derived correctness if outcome missing
    is_correct?: boolean | null;
    // derived condition
    condition?: ConditionLabel;
}

export interface ParsedResultFile {
    fileName: string;
    format: 'csv' | 'jsonl';
    rows: ResultRow[];
    totalRows: number;
    eligibleRows: number;
    subjects: string[]; // deduced unique subject_ids in this file
    sessionIds: string[]; // deduced unique session_ids
    errors: string[]; // fatal errors preventing usage
    warnings: string[]; // non-fatal warnings (e.g., missing latencies)
}

export interface AnimalMetrics {
    subjectId: string;
    nTotal: number;
    nEligible: number;
    nCorrect: number;
    nIncorrect: number;
    accuracy: number | null; // correct / eligible
    latencyMean: number | null;
    latencyMedian: number | null;
    perCondition: {
        [cond in ConditionLabel]: {
            n: number;
            nEligible: number;
            nCorrect: number;
            accuracy: number | null;
            latencyMean: number | null;
            latencyMedian: number | null;
        };
    };
}

export interface CombinedMetrics {
    subjects: AnimalMetrics[];
    overall: {
        nTotal: number;
        nEligible: number;
        nCorrect: number;
        nIncorrect: number;
        accuracy: number | null;
        latencyMean: number | null;
        latencyMedian: number | null;
    };
}

export function deriveCondition(is_partner_call: boolean, call_category?: string): ConditionLabel {
    if (is_partner_call) return 'partner';
    const cc = (call_category || '').toLowerCase();
    if (cc === 'familiar') return 'familiar_non_partner';
    if (cc === 'unfamiliar') return 'unfamiliar';
    return 'unknown';
}
