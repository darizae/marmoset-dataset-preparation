import { AnimalMetrics, ConditionLabel, ResultRow, CombinedMetrics } from './resultsTypes';

function mean(vals: number[]): number | null {
    if (!vals.length) return null;
    const s = vals.reduce((a, b) => a + b, 0);
    return s / vals.length;
}

function median(vals: number[]): number | null {
    if (!vals.length) return null;
    const a = [...vals].sort((x, y) => x - y);
    const m = Math.floor(a.length / 2);
    if (a.length % 2 === 0) return (a[m - 1] + a[m]) / 2;
    return a[m];
}

function isEligible(row: ResultRow): boolean {
    return !(row.aborted === true || row.timeout === true);
}

function getLatency(row: ResultRow): number | null {
    const v = row.latency_sec;
    if (v === undefined || v === null) return null;
    if (!Number.isFinite(v)) return null;
    if (v < 0) return null;
    return v;
}

export function computeAnimalMetrics(rows: ResultRow[], subjectId: string): AnimalMetrics {
    const rowsFor = rows.filter((r) => r.subject_id === subjectId);
    const nTotal = rowsFor.length;
    const eligible = rowsFor.filter(isEligible);
    const nEligible = eligible.length;

    const corrects = eligible.filter((r) => r.is_correct === true);
    const incorrects = eligible.filter((r) => r.is_correct === false);
    const nCorrect = corrects.length;
    const nIncorrect = incorrects.length;
    const accuracy = nEligible > 0 ? nCorrect / nEligible : null;

    const latencies = eligible.map(getLatency).filter((v): v is number => v !== null);
    const latencyMean = mean(latencies);
    const latencyMedian = median(latencies);

    const conditionLabels: ConditionLabel[] = ['partner', 'familiar_non_partner', 'unfamiliar', 'unknown'];
    const perCondition: AnimalMetrics['perCondition'] = {
        partner: { n: 0, nEligible: 0, nCorrect: 0, accuracy: null, latencyMean: null, latencyMedian: null },
        familiar_non_partner: { n: 0, nEligible: 0, nCorrect: 0, accuracy: null, latencyMean: null, latencyMedian: null },
        unfamiliar: { n: 0, nEligible: 0, nCorrect: 0, accuracy: null, latencyMean: null, latencyMedian: null },
        unknown: { n: 0, nEligible: 0, nCorrect: 0, accuracy: null, latencyMean: null, latencyMedian: null }
    };

    for (const cond of conditionLabels) {
        const allCond = rowsFor.filter((r) => r.condition === cond);
        const eligCond = allCond.filter(isEligible);
        const correctCond = eligCond.filter((r) => r.is_correct === true);
        const latCond = eligCond.map(getLatency).filter((v): v is number => v !== null);
        perCondition[cond].n = allCond.length;
        perCondition[cond].nEligible = eligCond.length;
        perCondition[cond].nCorrect = correctCond.length;
        perCondition[cond].accuracy = eligCond.length > 0 ? correctCond.length / eligCond.length : null;
        perCondition[cond].latencyMean = mean(latCond);
        perCondition[cond].latencyMedian = median(latCond);
    }

    return {
        subjectId,
        nTotal,
        nEligible,
        nCorrect,
        nIncorrect,
        accuracy,
        latencyMean,
        latencyMedian,
        perCondition
    };
}

export function computeCombinedMetrics(rows: ResultRow[]): CombinedMetrics {
    const subjects = Array.from(new Set(rows.map((r) => r.subject_id))).sort();
    const metricsPerSubject = subjects.map((sid) => computeAnimalMetrics(rows, sid));

    const nTotal = metricsPerSubject.reduce((acc, m) => acc + m.nTotal, 0);
    const nEligible = metricsPerSubject.reduce((acc, m) => acc + m.nEligible, 0);
    const nCorrect = metricsPerSubject.reduce((acc, m) => acc + m.nCorrect, 0);
    const nIncorrect = metricsPerSubject.reduce((acc, m) => acc + m.nIncorrect, 0);
    const accuracy = nEligible > 0 ? nCorrect / nEligible : null;

    // Overall latency computed from all eligible latencies across animals
    const eligibleRows = rows.filter((r) => !(r.aborted || r.timeout)).map((r) => r.latency_sec).filter((v): v is number => Number.isFinite(v as number)) as number[];
    const latencyMean = eligibleRows.length ? eligibleRows.reduce((a, b) => a + b, 0) / eligibleRows.length : null;
    const sorted = [...eligibleRows].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const latencyMedian = sorted.length ? (sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]) : null;

    return {
        subjects: metricsPerSubject,
        overall: {
            nTotal,
            nEligible,
            nCorrect,
            nIncorrect,
            accuracy,
            latencyMean,
            latencyMedian
        }
    };
}
