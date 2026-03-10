import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import {
    Alert,
    Box,
    Button,
    FormControl,
    InputLabel,
    LinearProgress,
    MenuItem,
    Select,
    Stack,
    Typography
} from '@mui/material';
import React, { Suspense, useMemo, useState } from 'react';
import ResultFileList from './ResultFileList';
import { parseResultsCsv, parseResultsJsonl } from '../../domain/resultsParser';
import { ParsedResultFile, ResultRow } from '../../domain/resultsTypes';
import { computeCombinedMetrics } from '../../domain/resultsMetrics';
import PageSection from '../common/PageSection';
import HelpHint from '../common/HelpHint';
import MetricChips from '../common/MetricChips';
import ContextHelpButton from '../help/ContextHelpButton';
import { HelpTopicId } from '../help/helpTopics';
import ResultsDetailView from './ResultsDetailView';
import { aggregateResultIssues } from './resultsState';
import { usePersistentState, useSessionState } from '../../persistence/hooks';
import { storageKeys } from '../../persistence/keys';

const AccuracyBarChart = React.lazy(() => import('./charts/AccuracyBarChart'));

type UploadStatus = 'idle' | 'parsing' | 'done';

interface Props {
    onOpenHelp: (topicId: HelpTopicId) => void;
}

const ResultsTab: React.FC<Props> = ({ onOpenHelp }) => {
    const [status, setStatus] = useState<UploadStatus>('idle');
    const [files, setFiles] = useState<ParsedResultFile[]>([]);
    const [selectedSubject, setSelectedSubject] = useSessionState<string>(storageKeys.resultsSession, '');
    const [uploadErrors, setUploadErrors] = useState<string[]>([]);
    const [helpHintDismissed, setHelpHintDismissed] = usePersistentState<boolean>(`${storageKeys.appPreferences}.resultsHelpHintDismissed`, false);

    const issues = useMemo(() => aggregateResultIssues(files), [files]);

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        setStatus('parsing');
        setFiles([]);
        setSelectedSubject('');
        setUploadErrors([]);
        const fileList = event.target.files;
        if (!fileList || fileList.length === 0) {
            setStatus('idle');
            return;
        }

        const selectedFiles = Array.from(fileList);
        const parsed: ParsedResultFile[] = [];
        const uploadErrors: string[] = [];

        for (const file of selectedFiles) {
            try {
                const name = file.name.toLowerCase();
                if (name.endsWith('.csv')) {
                    parsed.push(await parseResultsCsv(file));
                } else if (name.endsWith('.jsonl')) {
                    parsed.push(await parseResultsJsonl(file));
                } else {
                    uploadErrors.push(`Unsupported file type for "${file.name}". Only CSV and JSONL are supported.`);
                }
            } catch (error: any) {
                uploadErrors.push(`${file.name}: ${error?.message || String(error)}`);
            }
        }

        setUploadErrors(uploadErrors);
        setFiles(parsed);
        const subjects = Array.from(new Set(parsed.flatMap((file) => file.subjects))).sort();
        setSelectedSubject(subjects[0] || '');
        setStatus('done');
    };

    const handleRemoveFile = (fileName: string) => {
        const next = files.filter((file) => file.fileName !== fileName);
        setFiles(next);
        const subjects = Array.from(new Set(next.flatMap((file) => file.subjects))).sort();
        if (!subjects.includes(selectedSubject)) {
            setSelectedSubject(subjects[0] || '');
        }
    };

    const allRows: ResultRow[] = useMemo(() => files.flatMap((file) => file.rows), [files]);
    const combined = useMemo(() => computeCombinedMetrics(allRows), [allRows]);
    const subjects = useMemo(() => Array.from(new Set(allRows.map((row) => row.subject_id))).sort(), [allRows]);
    const accuracies = useMemo(() => combined.subjects.map((subject) => subject.accuracy), [combined]);

    const clearAll = () => {
        setStatus('idle');
        setFiles([]);
        setSelectedSubject('');
        setUploadErrors([]);
    };

    return (
        <Stack spacing={3}>
            <HelpHint visible={!helpHintDismissed} onDismiss={() => setHelpHintDismissed(true)} />

            <PageSection
                title="Upload files"
                description="Load result files first. Each file is parsed independently so file-specific issues stay visible."
                action={<ContextHelpButton topicId="results-upload" onOpen={onOpenHelp} label="Help" />}
            >
                <Stack spacing={2}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                        <Button component="label" variant="contained" startIcon={<UploadFileRoundedIcon />}>
                            Upload CSV or JSONL
                            <input
                                hidden
                                data-testid="results-upload-input"
                                type="file"
                                multiple
                                accept=".csv,.jsonl"
                                onChange={handleUpload}
                            />
                        </Button>
                        <Button variant="outlined" onClick={clearAll}>Clear uploads</Button>
                    </Stack>

                    {status === 'parsing' ? <LinearProgress /> : null}

                    {uploadErrors.map((error) => (
                        <Alert key={error} severity="error">{error}</Alert>
                    ))}
                    {issues.errors.map((error) => (
                        <Alert key={error} severity="error">{error}</Alert>
                    ))}
                    {issues.warnings.map((warning) => (
                        <Alert key={warning} severity="warning">{warning}</Alert>
                    ))}

                    <ResultFileList files={files} onRemove={handleRemoveFile} />
                </Stack>
            </PageSection>

            <PageSection
                title="Summary metrics"
                description="Scan the overall totals first, then compare subject-level accuracy."
                action={<ContextHelpButton topicId="results-upload" onOpen={onOpenHelp} label="Help" compact />}
            >
                {files.length === 0 || allRows.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        Upload result files to see summary metrics and charts.
                    </Typography>
                ) : (
                    <Stack spacing={2}>
                        <MetricChips
                            items={[
                                { label: 'Trials', value: combined.overall.nTotal },
                                { label: 'Eligible', value: combined.overall.nEligible },
                                { label: 'Correct', value: combined.overall.nCorrect },
                                { label: 'Incorrect', value: combined.overall.nIncorrect },
                                {
                                    label: 'Accuracy',
                                    value: combined.overall.accuracy === null ? '—' : `${(combined.overall.accuracy * 100).toFixed(1)}%`
                                },
                                {
                                    label: 'Mean latency',
                                    value: combined.overall.latencyMean === null ? '—' : `${combined.overall.latencyMean.toFixed(3)} s`
                                },
                                {
                                    label: 'Median latency',
                                    value: combined.overall.latencyMedian === null ? '—' : `${combined.overall.latencyMedian.toFixed(3)} s`
                                }
                            ]}
                        />

                        <Suspense fallback={<LinearProgress />}>
                            <AccuracyBarChart labels={combined.subjects.map((subject) => subject.subjectId)} accuracies={accuracies} />
                        </Suspense>
                    </Stack>
                )}
            </PageSection>

            <PageSection
                title="Subject detail"
                description="Choose one detected subject to inspect per-condition accuracy and latency distributions."
                action={<ContextHelpButton topicId="results-upload" onOpen={onOpenHelp} label="Help" compact />}
            >
                {subjects.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        No subjects detected yet.
                    </Typography>
                ) : (
                    <Stack spacing={2}>
                        <Box sx={{ maxWidth: 320 }}>
                            <FormControl fullWidth>
                                <InputLabel id="subject-detail-label">Subject</InputLabel>
                                <Select
                                    labelId="subject-detail-label"
                                    label="Subject"
                                    value={selectedSubject}
                                    onChange={(event) => setSelectedSubject(event.target.value)}
                                >
                                    {subjects.map((subjectId) => (
                                        <MenuItem key={subjectId} value={subjectId}>{subjectId}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>

                        {selectedSubject ? <ResultsDetailView rows={allRows} subjectId={selectedSubject} /> : null}
                    </Stack>
                )}
            </PageSection>
        </Stack>
    );
};

export default ResultsTab;
