import React, { useMemo } from 'react';
import { ResultRow } from '../domain/resultsTypes';
import { computeAnimalMetrics } from '../domain/resultsMetrics';
import ConditionAccuracyBarChart from './charts/ConditionAccuracyBarChart';
import LatencyDistributionChart from './charts/LatencyDistributionChart';

interface Props {
    rows: ResultRow[];
    subjectId: string;
}

function fmtPct(p: number | null): string {
    if (p === null) return '—';
    return `${(p * 100).toFixed(1)}%`;
}
function fmtNum(n: number | null): string {
    if (n === null) return '—';
    return n.toFixed(3);
}

const ResultsDetailView: React.FC<Props> = ({ rows, subjectId }) => {
    const metrics = useMemo(() => computeAnimalMetrics(rows, subjectId), [rows, subjectId]);

    const conditionLabels = ['partner', 'familiar_non_partner', 'unfamiliar', 'unknown'];
    const condAcc = conditionLabels.map((c) => metrics.perCondition[c as any].accuracy);

    const latenciesBySubject = useMemo(() => {
        const latencies = rows
            .filter((r) => r.subject_id === subjectId && !(r.aborted || r.timeout))
            .map((r) => r.latency_sec)
            .filter((v): v is number => Number.isFinite(v as number)) as number[];
        return [{ label: subjectId, latencies }];
    }, [rows, subjectId]);

    return (
        <div>
            <div className="section-subtitle">Subject {subjectId} summary</div>
            <div className="inline-input-row">
                <span className="chip">Trials: {metrics.nTotal}</span>
                <span className="chip">Eligible: {metrics.nEligible}</span>
                <span className="chip">Correct: {metrics.nCorrect}</span>
                <span className="chip">Incorrect: {metrics.nIncorrect}</span>
                <span className="chip">Accuracy: {fmtPct(metrics.accuracy)}</span>
                <span className="chip">Mean latency: {fmtNum(metrics.latencyMean)} s</span>
                <span className="chip">Median latency: {fmtNum(metrics.latencyMedian)} s</span>
            </div>

            <div style={{ marginTop: '0.75rem' }}>
                <ConditionAccuracyBarChart subjectId={subjectId} labels={conditionLabels} accuracies={condAcc} />
            </div>

            <div style={{ marginTop: '0.75rem' }}>
                <LatencyDistributionChart series={latenciesBySubject} />
            </div>
        </div>
    );
};

export default ResultsDetailView;
