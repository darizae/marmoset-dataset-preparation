import { DatasetManifest } from '../types';
import { TrialConfig, TrialSet } from '../trialTypes';

export type BundleMode = 'build' | 'visualize';

export type BundleSeedPolicy =
    | {
    strategy: 'global';
    globalSeed: string;
    perSubjectOverrides: Record<string, string>;
}
    | {
    strategy: 'per_subject';
    perSubjectSeeds: Record<string, string>;
};

export interface BundleCounts {
    overallTrials: number;
    perSubjectTrials: Record<string, number>;
}

export interface DatasetMeta {
    dataset_id: string;
    created_at: string;
    source_data_dir_label: string;
    subjects: string[];
    seed_policy: BundleSeedPolicy;
    generator_config: Omit<TrialConfig, 'seed'>;
    counts: BundleCounts;
}

export interface BundleInMemory {
    datasetMeta: DatasetMeta;
    manifest: DatasetManifest;
    trialSets: Record<string, TrialSet>;
    mediaByInternalPath: Map<string, File>;
}

export interface BundleParseResult {
    bundleRootLabel: string;
    datasetMeta: DatasetMeta;
    manifest: DatasetManifest;
    trialSets: Record<string, TrialSet>;
    mediaByInternalPath: Map<string, File>;
}
