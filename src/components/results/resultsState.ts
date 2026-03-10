import { ParsedResultFile } from '../../domain/resultsTypes';

export interface AggregatedResultIssues {
    errors: string[];
    warnings: string[];
}

export function aggregateResultIssues(files: ParsedResultFile[]): AggregatedResultIssues {
    const warnings: string[] = [];
    const errors: string[] = [];

    for (const file of files) {
        warnings.push(...file.warnings.map((warning) => `${file.fileName}: ${warning}`));
        errors.push(...file.errors.map((error) => `${file.fileName}: ${error}`));
    }

    return { errors, warnings };
}
