export interface CsvIdentityRow {
    ID: string;
    [key: string]: any;
}

export interface Exemplar {
    index: number;
    relativePath: string;
    fileName: string;
}

export interface IdentityDatasetEntry {
    id: string;
    properties: { [key: string]: any };
    nImageExemplars: number;
    nAudioExemplars: number;
    hasEnoughImages: boolean;
    hasEnoughAudios: boolean;
    expectedMinImages: number;
    expectedMinAudios: number;
    imageExemplars: Exemplar[];
    audioExemplars: Exemplar[];
}

export interface DatasetManifest {
    meta: {
        dataDirLabel: string;
        expected_n_images: number;
        expected_n_audios: number;
    };
    identities: IdentityDatasetEntry[];
}

export type WarningType = 'csv' | 'media' | 'identity';

export interface DatasetWarning {
    type: WarningType;
    message: string;
    identityId?: string;
}

export interface FileError {
    fileName: string;
    relativePath: string;
    message: string;
}

export interface BuildDatasetResult {
    manifest: DatasetManifest;
    warnings: DatasetWarning[];
    fileErrors: FileError[];
}

export interface CsvParseResult {
    rows: CsvIdentityRow[];
    infoColumns: string[];
}
