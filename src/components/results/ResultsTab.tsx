import React, { useCallback, useMemo, useState } from 'react';
import ResultFileList from './ResultFileList';
import { parseResultsCsv, parseResultsJsonl } from '../../domain/resultsParser';
import { ParsedResultFile, ResultRow } from '../../domain/resultsTypes';
import { computeCombinedMetrics } from '../../domain/resultsMetrics';
import AccuracyBarChart from './charts/AccuracyBarChart';
import ResultsDetailView from './ResultsDetailView';

type UploadStatus = 'idle' | 'parsing' | 'done';

const ResultsTab: React.FC = () => {
    const [status, setStatus] = useState<UploadStatus>('idle');
    const [files, setFiles] = useState<ParsedResultFile[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string>('');

    const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        setStatus('parsing');
        setFiles([]);
        setErrors([]);
        setWarnings([]);
        setSelectedSubject('');
        const fl = e.target.files;
        if (!fl || fl.length === 0) {
            setStatus('idle');
            return;
        }
        const arr = Array.from(fl);
        const parsed: ParsedResultFile[] = [];
        const allWarnings: string[] = [];
        const allErrors: string[] = [];
        for (const file of arr) {
            try {
                const name = file.name.toLowerCase();
                let res: ParsedResultFile;
                if (name.endsWith('.csv')) {
                    res = await parseResultsCsv(file);
                } else if (name.endsWith('.jsonl')) {
                    res = await parseResultsJsonl(file);
                } else {
                    allErrors.push(`Unsupported file type for "${file.name}". Only CSV and JSONL are supported.`);
                    continue;
                }
                parsed.push(res);
                if (res.warnings.length) {
                    allWarnings.push(...res.warnings.map((w) => `${file.name}: ${w}`));
                }
                if (res.errors.length) {
                    allErrors.push(...res.errors.map((er) => `${file.name}: ${er}`));
                }
            } catch (err: any) {
                allErrors.push(`${file.name}: ${err?.message || String(err)}`);
            }
        }
        setFiles(parsed);
        setWarnings(allWarnings);
        setErrors(allErrors);
        setStatus('done');
        // default selection: first subject found
        const subjects = Array.from(new Set(parsed.flatMap((f) => f.subjects))).sort();
        setSelectedSubject(subjects[0] || '');
    }, []);

    const handleRemoveFile = useCallback((fileName: string) => {
        const next = files.filter((f) => f.fileName !== fileName);
        setFiles(next);
        const subjects = Array.from(new Set(next.flatMap((f) => f.subjects))).sort();
        if (!subjects.includes(selectedSubject)) {
            setSelectedSubject(subjects[0] || '');
        }
    }, [files, selectedSubject]);

    const allRows: ResultRow[] = useMemo(() => files.flatMap((f) => f.rows), [files]);

    const combined = useMemo(() => computeCombinedMetrics(allRows), [allRows]);

    const subjects = useMemo(() => Array.from(new Set(allRows.map((r) => r.subject_id))).sort(), [allRows]);

    const accuracies = useMemo(() => {
        return combined.subjects.map((m) => m.accuracy);
    }, [combined]);

    const latenciesBySubjectForChart = useMemo(() => {
        // separate component covers latencies; here we only need accuracy chart
        return [];
    }, [allRows]);

    const clearAll = useCallback(() => {
        setStatus('idle');
        setFiles([]);
        setWarnings([]);
        setErrors([]);
        setSelectedSubject('');
    }, []);

    return (
        <div>
            <section className="section">
                <div className="section-title">Upload result files (CSV or JSONL)</div>
                <div className="section-subtitle">Multiple files supported. Each file is parsed independently; errors are shown per-file.</div>
                <div className="inline-input-row">
                    <input type="file" multiple accept=".csv,.jsonl" onChange={handleUpload} />
                    <button className="button" onClick={clearAll}>Clear uploads</button>
                    {status === 'parsing' && <span className="small-text">Parsing…</span>}
                </div>
                {errors.length > 0 && (
                    <div style={{ marginTop: '0.5rem' }}>
                        <div className="label">Errors:</div>
                        <ul className="error-list">
                            {errors.map((e, idx) => (
                                <li key={idx} className="error-item">{e}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {warnings.length > 0 && (
                    <div style={{ marginTop: '0.5rem' }}>
                        <div className="label">Warnings:</div>
                        <ul className="warning-list">
                            {warnings.map((w, idx) => (
                                <li key={idx} className="warning-item">{w}</li>
                            ))}
                        </ul>
                    </div>
                )}
                <div style={{ marginTop: '0.75rem' }}>
                    <ResultFileList files={files} onRemove={handleRemoveFile} />
                </div>
            </section>

            <section className="section">
                <div className="section-title">Summary metrics across loaded files</div>
                {files.length === 0 ? (
                    <div className="small-text">Upload result files to see summary metrics and charts.</div>
                ) : (
                    <>
                        <div className="inline-input-row">
                            <span className="chip">Trials: {combined.overall.nTotal}</span>
                            <span className="chip">Eligible: {combined.overall.nEligible}</span>
                            <span className="chip">Correct: {combined.overall.nCorrect}</span>
                            <span className="chip">Incorrect: {combined.overall.nIncorrect}</span>
                            <span className="chip">Accuracy: {combined.overall.accuracy === null ? '—' : `${(combined.overall.accuracy * 100).toFixed(1)}%`}</span>
                            <span className="chip">Mean latency: {combined.overall.latencyMean === null ? '—' : `${combined.overall.latencyMean.toFixed(3)} s`}</span>
                            <span className="chip">Median latency: {combined.overall.latencyMedian === null ? '—' : `${combined.overall.latencyMedian.toFixed(3)} s`}</span>
                        </div>
                        <div style={{ marginTop: '0.75rem' }}>
                            <AccuracyBarChart labels={combined.subjects.map((m) => m.subjectId)} accuracies={accuracies} />
                        </div>
                    </>
                )}
            </section>

            <section className="section">
                <div className="section-title">Detail view</div>
                {subjects.length === 0 ? (
                    <div className="small-text">No subjects detected yet.</div>
                ) : (
                    <>
                        <div className="inline-input-row">
                            <label className="label">
                                Subject
                                <select
                                    className="input-number"
                                    value={selectedSubject}
                                    onChange={(e) => setSelectedSubject(e.target.value)}
                                >
                                    {subjects.map((sid) => (
                                        <option key={sid} value={sid}>{sid}</option>
                                    ))}
                                </select>
                            </label>
                            <span className="small-text">Select a subject to view per-condition metrics and latency distribution.</span>
                        </div>
                        <div style={{ marginTop: '0.5rem' }}>
                            {selectedSubject && <ResultsDetailView rows={allRows} subjectId={selectedSubject} />}
                        </div>
                    </>
                )}
            </section>
        </div>
    );
};

export default ResultsTab;
