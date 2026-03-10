import { describe, expect, it } from 'vitest';
import { aggregateResultIssues } from './resultsState';

describe('aggregateResultIssues', () => {
    it('keeps only issues from the loaded files', () => {
        const issues = aggregateResultIssues([
            {
                fileName: 'a.csv',
                format: 'csv',
                rows: [],
                totalRows: 0,
                eligibleRows: 0,
                subjects: [],
                sessionIds: [],
                errors: ['bad header'],
                warnings: ['missing latency']
            },
            {
                fileName: 'b.csv',
                format: 'csv',
                rows: [],
                totalRows: 0,
                eligibleRows: 0,
                subjects: [],
                sessionIds: [],
                errors: [],
                warnings: ['missing session id']
            }
        ]);

        expect(issues.errors).toEqual(['a.csv: bad header']);
        expect(issues.warnings).toEqual(['a.csv: missing latency', 'b.csv: missing session id']);
    });
});
