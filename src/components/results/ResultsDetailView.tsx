import React, { Suspense, useMemo } from 'react';
import { LinearProgress, Stack, Typography } from '@mui/material';
import { ResultRow } from '../../domain/resultsTypes';
import { computeAnimalMetrics } from '../../domain/resultsMetrics';
import MetricChips from '../common/MetricChips';

const ConditionAccuracyBarChart = React.lazy(() => import('./charts/ConditionAccuracyBarChart'));
const LatencyDistributionChart = React.lazy(() => import('./charts/LatencyDistributionChart'));

interface Props {
    rows: ResultRow[];
    subjectId: string;
}

function fmtPct(value: number | null): string {
    return value === null ? '—' : `${(value * 100).toFixed(1)}%`;
}

function fmtNum(value: number | null): string {
    return value === null ? '—' : value.toFixed(3);
}

const ResultsDetailView: React.FC<Props> = ({ rows, subjectId }) => {
    const metrics = useMemo(() => computeAnimalMetrics(rows, subjectId), [rows, subjectId]);
    const conditionLabels = ['partner', 'familiar_non_partner', 'unfamiliar', 'unknown'];
    const condAcc = conditionLabels.map((label) => metrics.perCondition[label as keyof typeof metrics.perCondition].accuracy);

    const latenciesBySubject = useMemo(() => {
        const latencies = rows
            .filter((row) => row.subject_id === subjectId && !(row.aborted || row.timeout))
            .map((row) => row.latency_sec)
            .filter((value): value is number => Number.isFinite(value as number)) as number[];

        return [{ label: subjectId, latencies }];
    }, [rows, subjectId]);

    return (
        <Stack spacing={2.5}>
            <div>
                <Typography variant="subtitle1">Subject {subjectId}</Typography>
                <Typography variant="body2" color="text.secondary">
                    Review the subject summary before drilling into per-condition accuracy and latency distributions.
                </Typography>
            </div>

            <MetricChips
                items={[
                    { label: 'Trials', value: metrics.nTotal },
                    { label: 'Eligible', value: metrics.nEligible },
                    { label: 'Correct', value: metrics.nCorrect },
                    { label: 'Incorrect', value: metrics.nIncorrect },
                    { label: 'Accuracy', value: fmtPct(metrics.accuracy) },
                    { label: 'Mean latency', value: `${fmtNum(metrics.latencyMean)} s` },
                    { label: 'Median latency', value: `${fmtNum(metrics.latencyMedian)} s` }
                ]}
            />

            <Suspense fallback={<LinearProgress />}>
                <ConditionAccuracyBarChart subjectId={subjectId} labels={conditionLabels} accuracies={condAcc} />
                <LatencyDistributionChart series={latenciesBySubject} />
            </Suspense>
        </Stack>
    );
};

export default ResultsDetailView;
