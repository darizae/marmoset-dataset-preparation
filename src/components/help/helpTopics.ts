export type HelpTopicId =
    | 'dataset-requirements'
    | 'subject-eligibility'
    | 'generation-settings'
    | 'validation-errors'
    | 'bundle-explorer'
    | 'results-upload';

export interface HelpTopic {
    id: HelpTopicId;
    title: string;
    summary: string;
    sections: { heading: string; body: string }[];
}

export const helpTopics: Record<HelpTopicId, HelpTopic> = {
    'dataset-requirements': {
        id: 'dataset-requirements',
        title: 'Dataset requirements',
        summary: 'Select the dataset root that contains data_info.csv and the source media files.',
        sections: [
            {
                heading: 'What is required',
                body: 'The selected folder must contain data_info.csv directly at the root. JPG/JPEG and WAV files can be in the root or nested folders.'
            },
            {
                heading: 'How media is matched',
                body: 'Media file names must follow <ID><index>.EXT, such as Odin1.jpg or A3.wav. IDs must exist in data_info.csv.'
            }
        ]
    },
    'subject-eligibility': {
        id: 'subject-eligibility',
        title: 'Subject eligibility',
        summary: 'Subjects are build candidates only when partner and sex metadata are consistent.',
        sections: [
            {
                heading: 'Selection defaults',
                body: 'Focal subjects are preselected automatically. If no focal flag is present, all identities remain available.'
            },
            {
                heading: 'Blocking rules',
                body: 'A subject is blocked when the partner is missing, sex metadata is missing, or subject and partner sex values do not match.'
            }
        ]
    },
    'generation-settings': {
        id: 'generation-settings',
        title: 'Generation settings',
        summary: 'Tune trial counts only when the default distribution no longer fits the study design.',
        sections: [
            {
                heading: 'Recommended defaults',
                body: 'Use the default familiar and partner fractions unless you need a different balance of partner, familiar non-partner, and unfamiliar calls.'
            },
            {
                heading: 'Seeds and pairings',
                body: 'The global seed gives deterministic subject-specific seeds. Pairing avoidance reduces repeated audio-image combinations for the same identity.'
            }
        ]
    },
    'validation-errors': {
        id: 'validation-errors',
        title: 'Validation messages',
        summary: 'Warnings highlight quality issues; strict errors block generation or bundle export.',
        sections: [
            {
                heading: 'Warnings',
                body: 'Warnings flag incomplete media coverage or non-fatal parsing issues. Review them before export, but they do not stop the workflow by themselves.'
            },
            {
                heading: 'Strict errors',
                body: 'Strict errors indicate missing required files, invalid path structures, or generation conditions that make a bundle unsafe to produce.'
            }
        ]
    },
    'bundle-explorer': {
        id: 'bundle-explorer',
        title: 'Bundle explorer',
        summary: 'Use the explorer to inspect one subject at a time, filter trials, and preview media.',
        sections: [
            {
                heading: 'How selection works',
                body: 'Changing subject resets filters and preview state. If filters remove the active trial, the explorer selects the next visible trial automatically.'
            },
            {
                heading: 'What to verify',
                body: 'Check trial counts, condition mix, partner side balance, and whether image/audio previews match the selected identity and condition.'
            }
        ]
    },
    'results-upload': {
        id: 'results-upload',
        title: 'Results upload',
        summary: 'Load CSV or JSONL output files, review parse issues, and then inspect summary metrics by subject.',
        sections: [
            {
                heading: 'Supported files',
                body: 'CSV and JSONL files are parsed independently. Unsupported files are ignored and reported as errors.'
            },
            {
                heading: 'How to review',
                body: 'Start with file-level issues, then summary metrics, then inspect a subject for per-condition accuracy and latency distributions.'
            }
        ]
    }
};
