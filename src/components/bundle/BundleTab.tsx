import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Button,
    Checkbox,
    Chip,
    FormControlLabel,
    Grid,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import FolderSelector from '../common/FolderSelector';
import ErrorList from '../common/ErrorList';
import PageSection from '../common/PageSection';
import ValidationSummary from '../common/ValidationSummary';
import ContextHelpButton from '../help/ContextHelpButton';
import { HelpTopicId } from '../help/helpTopics';
import { parseDataInfoCsv } from '../../domain/csvParser';
import { buildDatasetManifest } from '../../domain/datasetBuilder';
import { CsvIdentityRow, DatasetManifest, DatasetWarning, FileError } from '../../domain/types';
import { TrialConfig, TrialSet } from '../../domain/trialTypes';
import BundleStepHeader from './BundleStepHeader';
import BundleExplorer from './BundleExplorer';
import {
    buildBundleInMemory,
    buildSeedPolicyGlobal,
    chooseDefaultDatasetId,
    deriveSubjectSeed,
    downloadBundleZip,
    generateMultiSubjectTrials,
    listDefaultSubjectIds
} from '../../domain/bundle/bundleBuilder';
import { BuildStep, computePoolSummary, inferFolderLabel, isFocal } from './bundleWorkflow';
import { usePersistentState, useSessionState } from '../../persistence/hooks';
import { storageKeys } from '../../persistence/keys';
import HelpHint from '../common/HelpHint';

interface Props {
    onOpenHelp: (topicId: HelpTopicId) => void;
}

function getRelativePath(file: File): string {
    const fileWithRelativePath = file as File & { webkitRelativePath?: string };
    if (typeof fileWithRelativePath.webkitRelativePath === 'string' && fileWithRelativePath.webkitRelativePath.length > 0) {
        return fileWithRelativePath.webkitRelativePath;
    }
    return file.name;
}

function buildSourceMediaMap(manifest: DatasetManifest, files: File[]): Map<string, File> {
    const filesByRelativePath = new Map(files.map((file) => [getRelativePath(file), file]));
    const media = new Map<string, File>();

    for (const identity of manifest.identities) {
        for (const exemplar of [...identity.imageExemplars, ...identity.audioExemplars]) {
            const file = filesByRelativePath.get(exemplar.relativePath);
            if (file) {
                media.set(exemplar.relativePath, file);
            }
        }
    }

    return media;
}

const BundleTab: React.FC<Props> = ({ onOpenHelp }) => {
    const [step, setStep] = useSessionState<BuildStep>(storageKeys.buildSession, 1);
    const [advancedSettingsExpanded, setAdvancedSettingsExpanded] = useSessionState<boolean>(`${storageKeys.buildSession}.advancedExpanded`, false);

    const [datasetFiles, setDatasetFiles] = useState<File[]>([]);
    const [datasetFolderLabel, setDatasetFolderLabel] = useState<string>('No folder selected');
    const [csvError, setCsvError] = useState<string | null>(null);
    const [csvRows, setCsvRows] = useState<CsvIdentityRow[] | null>(null);
    const [manifest, setManifest] = useState<DatasetManifest | null>(null);
    const [datasetWarnings, setDatasetWarnings] = useState<DatasetWarning[]>([]);
    const [datasetFileErrors, setDatasetFileErrors] = useState<FileError[]>([]);

    const [selectedSubjectIds, setSelectedSubjectIds] = useSessionState<string[]>(`${storageKeys.buildSession}.selectedSubjects`, []);
    const [datasetId, setDatasetId] = useSessionState<string>(`${storageKeys.buildSession}.datasetId`, '');

    const [totalTrials, setTotalTrials] = usePersistentState<number>(`${storageKeys.buildPreferences}.totalTrials`, 40);
    const [familiarFraction, setFamiliarFraction] = usePersistentState<number>(`${storageKeys.buildPreferences}.familiarFraction`, 0.5);
    const [partnerFractionWithinFamiliar, setPartnerFractionWithinFamiliar] = usePersistentState<number>(`${storageKeys.buildPreferences}.partnerFractionWithinFamiliar`, 0.5);
    const [balanceSides, setBalanceSides] = usePersistentState<boolean>(`${storageKeys.buildPreferences}.balanceSides`, true);
    const [avoidRepeatPairings, setAvoidRepeatPairings] = usePersistentState<boolean>(`${storageKeys.buildPreferences}.avoidRepeatPairings`, true);
    const [globalSeed, setGlobalSeed] = usePersistentState<string>(`${storageKeys.buildPreferences}.globalSeed`, '42');
    const [perSubjectOverrides, setPerSubjectOverrides] = useSessionState<Record<string, string>>(`${storageKeys.buildSession}.perSubjectOverrides`, {});

    const [trialSets, setTrialSets] = useState<Record<string, TrialSet>>({});
    const [generationErrors, setGenerationErrors] = useState<string[]>([]);
    const [generationWarnings, setGenerationWarnings] = useState<string[]>([]);
    const [helpHintDismissed, setHelpHintDismissed] = usePersistentState<boolean>(`${storageKeys.appPreferences}.buildHelpHintDismissed`, false);

    const resetBuilder = () => {
        setDatasetFiles([]);
        setDatasetFolderLabel('No folder selected');
        setCsvError(null);
        setCsvRows(null);
        setManifest(null);
        setDatasetWarnings([]);
        setDatasetFileErrors([]);
        setSelectedSubjectIds([]);
        setDatasetId('');
        setTrialSets({});
        setGenerationErrors([]);
        setGenerationWarnings([]);
        setAdvancedSettingsExpanded(false);
        setStep(1);
    };

    const onDatasetFolderChange = async (filesList: FileList | null) => {
        resetBuilder();
        if (!filesList || filesList.length === 0) return;

        const files = Array.from(filesList);
        const label = inferFolderLabel(files);
        setDatasetFiles(files);
        setDatasetFolderLabel(label);
        setDatasetId(chooseDefaultDatasetId(label));

        const dataInfoFile = files.find((file) => {
            const relativePath = getRelativePath(file);
            const isRoot = relativePath.split('/').length === 2;
            return isRoot && file.name === 'data_info.csv';
        });

        if (!dataInfoFile) {
            setCsvError('Required file "data_info.csv" must exist directly inside the selected dataset root folder.');
            return;
        }

        try {
            const parsed = await parseDataInfoCsv(dataInfoFile);
            setCsvRows(parsed.rows);
            const result = buildDatasetManifest({
                csvRows: parsed.rows,
                dataDirLabel: label,
                files,
                expectedImages: 1,
                expectedAudios: 1
            });

            setManifest(result.manifest);
            setDatasetWarnings(result.warnings);
            setDatasetFileErrors(result.fileErrors);

            const defaults = listDefaultSubjectIds(result.manifest).filter((subjectId) => {
                const entry = result.manifest.identities.find((identity) => identity.id === subjectId);
                return entry ? isFocal(entry) : false;
            });
            const fallback = listDefaultSubjectIds(result.manifest);
            setSelectedSubjectIds(defaults.length > 0 ? defaults : fallback);
            setStep(2);
        } catch (error: any) {
            setCsvError(error?.message || String(error));
        }
    };

    const subjectOptions = useMemo(() => {
        if (!manifest) return [];
        return manifest.identities.map((entry) => entry.id).sort();
    }, [manifest]);

    const selectedSubjectSummaries = useMemo(() => {
        if (!manifest) return [];
        return selectedSubjectIds.map((subjectId) => ({ subjectId, ...computePoolSummary(manifest, subjectId) }));
    }, [manifest, selectedSubjectIds]);

    const subjectSelectionStrictErrors = useMemo(() => {
        return selectedSubjectSummaries.flatMap((summary) => summary.errors);
    }, [selectedSubjectSummaries]);

    const baseConfig = useMemo((): Omit<TrialConfig, 'seed'> => ({
        totalTrials,
        familiarFraction,
        partnerFractionWithinFamiliar,
        balanceSides,
        avoidRepeatPairings
    }), [avoidRepeatPairings, balanceSides, familiarFraction, partnerFractionWithinFamiliar, totalTrials]);

    const seedPolicy = useMemo(() => buildSeedPolicyGlobal(globalSeed, perSubjectOverrides), [globalSeed, perSubjectOverrides]);

    const derivedSeeds = useMemo(() => {
        const out: Record<string, string> = {};
        for (const subjectId of selectedSubjectIds) {
            try {
                out[subjectId] = deriveSubjectSeed(seedPolicy, subjectId);
            } catch (error: any) {
                out[subjectId] = `ERROR: ${error?.message || String(error)}`;
            }
        }
        return out;
    }, [seedPolicy, selectedSubjectIds]);

    const previewMediaByPath = useMemo(() => {
        return manifest ? buildSourceMediaMap(manifest, datasetFiles) : new Map<string, File>();
    }, [datasetFiles, manifest]);

    useEffect(() => {
        if (!manifest && step !== 1) {
            setStep(1);
        }
    }, [manifest, setStep, step]);

    const canGoToStep = useCallback((target: BuildStep) => {
        if (target === 1) return true;
        if (target === 2) return Boolean(manifest) && datasetFileErrors.length === 0 && !csvError;
        if (target === 3) return Boolean(manifest) && selectedSubjectIds.length > 0;
        if (target === 4) return Object.keys(trialSets).length > 0 && generationErrors.length === 0;
        if (target === 5) return Object.keys(trialSets).length > 0 && generationErrors.length === 0;
        return false;
    }, [csvError, datasetFileErrors.length, generationErrors.length, manifest, selectedSubjectIds.length, trialSets]);

    const onToggleSubject = (subjectId: string) => {
        setTrialSets({});
        setGenerationErrors([]);
        setGenerationWarnings([]);
        setSelectedSubjectIds((prev) => {
            const next = prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId];
            return next.sort((left, right) => left.localeCompare(right));
        });
    };

    const focalSubjectIds = useMemo(() => {
        if (!manifest) return [];
        return manifest.identities.filter(isFocal).map((entry) => entry.id).sort();
    }, [manifest]);

    const selectSubjects = (ids: string[]) => {
        setTrialSets({});
        setGenerationErrors([]);
        setGenerationWarnings([]);
        setSelectedSubjectIds(ids);
    };

    const onGenerateTrials = () => {
        setGenerationErrors([]);
        setGenerationWarnings([]);
        setTrialSets({});

        if (!manifest) return;
        if (!selectedSubjectIds.length) {
            setGenerationErrors(['Select at least one subject.']);
            return;
        }
        if (datasetFileErrors.length > 0 || csvError) {
            setGenerationErrors(['Fix dataset file errors before generating trials.']);
            return;
        }
        if (subjectSelectionStrictErrors.length > 0) {
            setGenerationErrors(subjectSelectionStrictErrors);
            return;
        }

        try {
            const generated = generateMultiSubjectTrials(manifest, selectedSubjectIds, baseConfig, seedPolicy);
            const warnings = Object.keys(generated).flatMap((subjectId) =>
                (generated[subjectId].meta.warnings || []).map((warning) => `${subjectId}: ${warning.message}`)
            );
            setTrialSets(generated);
            setGenerationWarnings(warnings);
            setStep(4);
        } catch (error: any) {
            setGenerationErrors([error?.message || String(error)]);
        }
    };

    const onDownloadZip = async () => {
        if (!manifest || !Object.keys(trialSets).length) return;
        setGenerationErrors([]);
        try {
            const bundle = buildBundleInMemory(
                datasetId,
                datasetFolderLabel,
                manifest,
                trialSets,
                seedPolicy,
                baseConfig,
                datasetFiles
            );
            await downloadBundleZip(bundle, datasetId);
        } catch (error: any) {
            setGenerationErrors([error?.message || String(error)]);
        }
    };

    return (
        <Stack spacing={3}>
            <HelpHint visible={!helpHintDismissed} onDismiss={() => setHelpHintDismissed(true)} />

            <PageSection
                title="Build workflow"
                description="Move left to right: validate the dataset, confirm subjects, tune settings, preview the generated trials, then export the bundle."
                action={<ContextHelpButton topicId="dataset-requirements" onOpen={onOpenHelp} label="Help" />}
            >
                <BundleStepHeader step={step} setStep={setStep} canGoToStep={canGoToStep} />
            </PageSection>

            {step === 1 ? (
                <PageSection
                    title="Dataset selection and validation"
                    description="Start by selecting the dataset root. Only the minimum guidance stays inline; use help for the full requirements."
                    action={<ContextHelpButton topicId="dataset-requirements" onOpen={onOpenHelp} label="Help" />}
                >
                    <FolderSelector
                        onFolderChange={onDatasetFolderChange}
                        folderLabel={datasetFolderLabel}
                        helperText="The root must contain data_info.csv. Media can remain nested."
                    />
                    <ValidationSummary errors={csvError ? [csvError] : []} />
                    {csvRows ? (
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                            <Chip label={`CSV rows: ${csvRows.length}`} variant="outlined" />
                            {manifest ? <Chip label={`Identities: ${manifest.identities.length}`} variant="outlined" /> : null}
                        </Stack>
                    ) : null}
                </PageSection>
            ) : null}

            {step === 2 ? (
                <PageSection
                    title="Subject selection"
                    description="Keep the default focal subjects unless you need a different subset. Review partner and pool status before moving on."
                    action={<ContextHelpButton topicId="subject-eligibility" onOpen={onOpenHelp} label="Help" />}
                >
                    <Stack spacing={2}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Dataset ID"
                                    value={datasetId}
                                    onChange={(event) => setDatasetId(event.target.value)}
                                    helperText="Used in dataset_meta.json and as the downloaded zip name."
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ height: '100%', alignItems: 'center' }}>
                                    <Button variant="outlined" onClick={() => selectSubjects(focalSubjectIds.length > 0 ? focalSubjectIds : subjectOptions)}>
                                        Select recommended
                                    </Button>
                                    <Button variant="outlined" onClick={() => selectSubjects([])}>
                                        Clear all
                                    </Button>
                                </Stack>
                            </Grid>
                        </Grid>

                        <ErrorList warnings={datasetWarnings} fileErrors={datasetFileErrors} />
                        <ValidationSummary errors={subjectSelectionStrictErrors} />

                        {manifest ? (
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Use</TableCell>
                                            <TableCell>Subject</TableCell>
                                            <TableCell>Partner</TableCell>
                                            <TableCell>Familiar with media</TableCell>
                                            <TableCell>Unfamiliar with media</TableCell>
                                            <TableCell>Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {subjectOptions.map((subjectId) => {
                                            const summary = computePoolSummary(manifest, subjectId);
                                            const selected = selectedSubjectIds.includes(subjectId);
                                            const focal = isFocal(manifest.identities.find((entry) => entry.id === subjectId)!);
                                            const blocking = summary.errors.length > 0;

                                            return (
                                                <TableRow key={subjectId} hover>
                                                    <TableCell padding="checkbox">
                                                        <Checkbox checked={selected} onChange={() => onToggleSubject(subjectId)} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            <span>{subjectId}</span>
                                                            {focal ? <Chip label="Focal" size="small" color="primary" variant="outlined" /> : null}
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell>{summary.partnerId || '—'}</TableCell>
                                                    <TableCell>{summary.familiarWithMedia}</TableCell>
                                                    <TableCell>{summary.unfamiliarWithMedia}</TableCell>
                                                    <TableCell>
                                                        {blocking ? (
                                                            <Alert severity="error" sx={{ py: 0 }}>
                                                                {summary.errors.join(' ')}
                                                            </Alert>
                                                        ) : (
                                                            <Chip label="Ready" size="small" color="success" variant="outlined" />
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : null}

                        <Stack direction="row" spacing={1}>
                            <Button variant="outlined" onClick={() => setStep(1)}>
                                Back
                            </Button>
                            <Button
                                variant="contained"
                                onClick={() => setStep(3)}
                                disabled={selectedSubjectIds.length === 0 || datasetFileErrors.length > 0 || Boolean(csvError)}
                            >
                                Continue to settings
                            </Button>
                        </Stack>
                    </Stack>
                </PageSection>
            ) : null}

            {step === 3 ? (
                <PageSection
                    title="Generation settings"
                    description="Keep defaults unless the experiment design needs a different count split or deterministic seed override."
                    action={<ContextHelpButton topicId="generation-settings" onOpen={onOpenHelp} label="Help" />}
                >
                    <Stack spacing={3}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={3}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Total trials"
                                    value={totalTrials}
                                    onChange={(event) => setTotalTrials(Math.max(1, Number(event.target.value)))}
                                    inputProps={{ min: 1 }}
                                    helperText="Per subject."
                                />
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Familiar fraction"
                                    value={familiarFraction}
                                    onChange={(event) => {
                                        const value = Number(event.target.value);
                                        if (value >= 0 && value <= 1) setFamiliarFraction(value);
                                    }}
                                    inputProps={{ min: 0, max: 1, step: 0.05 }}
                                    helperText="Share of trials with familiar calls."
                                />
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Partner fraction within familiar"
                                    value={partnerFractionWithinFamiliar}
                                    onChange={(event) => {
                                        const value = Number(event.target.value);
                                        if (value >= 0 && value <= 1) setPartnerFractionWithinFamiliar(value);
                                    }}
                                    inputProps={{ min: 0, max: 1, step: 0.05 }}
                                    helperText="How much of the familiar set should be partner calls."
                                />
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <TextField
                                    fullWidth
                                    label="Global seed"
                                    value={globalSeed}
                                    onChange={(event) => setGlobalSeed(event.target.value)}
                                    helperText="Deterministic across subjects."
                                />
                            </Grid>
                        </Grid>

                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                            <FormControlLabel
                                control={<Checkbox checked={balanceSides} onChange={(event) => setBalanceSides(event.target.checked)} />}
                                label="Balance partner side"
                            />
                            <FormControlLabel
                                control={<Checkbox checked={avoidRepeatPairings} onChange={(event) => setAvoidRepeatPairings(event.target.checked)} />}
                                label="Avoid repeat audio-image pairings"
                            />
                        </Stack>

                        <Accordion expanded={advancedSettingsExpanded} onChange={(_, expanded) => setAdvancedSettingsExpanded(expanded)}>
                            <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="subtitle1">Advanced settings</Typography>
                                    <ContextHelpButton topicId="generation-settings" onOpen={onOpenHelp} label="What does this mean?" compact />
                                </Stack>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Stack spacing={2}>
                                    <Typography variant="body2" color="text.secondary">
                                        Override a derived subject seed only when you need a subject-specific deterministic sequence.
                                    </Typography>
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Subject</TableCell>
                                                    <TableCell>Derived seed</TableCell>
                                                    <TableCell>Override</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {selectedSubjectIds.map((subjectId) => (
                                                    <TableRow key={subjectId}>
                                                        <TableCell>{subjectId}</TableCell>
                                                        <TableCell>{derivedSeeds[subjectId]}</TableCell>
                                                        <TableCell>
                                                            <TextField
                                                                fullWidth
                                                                size="small"
                                                                value={perSubjectOverrides[subjectId] || ''}
                                                                onChange={(event) => {
                                                                    const value = event.target.value;
                                                                    setPerSubjectOverrides((prev) => ({ ...prev, [subjectId]: value }));
                                                                }}
                                                                placeholder="Leave empty to use the derived seed"
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Stack>
                            </AccordionDetails>
                        </Accordion>

                        <ValidationSummary errors={generationErrors} warnings={generationWarnings} />

                        <Stack direction="row" spacing={1}>
                            <Button variant="outlined" onClick={() => setStep(2)}>
                                Back
                            </Button>
                            <Button variant="contained" startIcon={<PlayArrowRoundedIcon />} onClick={onGenerateTrials}>
                                Generate trials
                            </Button>
                        </Stack>
                    </Stack>
                </PageSection>
            ) : null}

            {step === 4 ? (
                <PageSection
                    title="Preview and validation"
                    description="Inspect the generated trial sets before export. Use filters and preview media to confirm the bundle looks correct."
                    action={<ContextHelpButton topicId="bundle-explorer" onOpen={onOpenHelp} label="Help" />}
                    compact
                >
                    <Stack spacing={2}>
                        <ValidationSummary errors={generationErrors} warnings={generationWarnings} />
                        <Stack direction="row" spacing={1}>
                            <Button variant="outlined" onClick={() => setStep(3)}>
                                Back to settings
                            </Button>
                            <Button variant="contained" onClick={() => setStep(5)} disabled={generationErrors.length > 0}>
                                Continue to export
                            </Button>
                        </Stack>

                        <BundleExplorer
                            trialSets={trialSets}
                            resolveMediaFile={(path) => previewMediaByPath.get(path) || null}
                            strictErrors={generationErrors}
                            warnings={generationWarnings}
                            persistenceKey={storageKeys.buildPreviewSession}
                        />
                    </Stack>
                </PageSection>
            ) : null}

            {step === 5 ? (
                <PageSection
                    title="Export"
                    description="Export only after the preview is clean. The zip contains dataset metadata, trial sets, and the referenced media."
                    action={<ContextHelpButton topicId="validation-errors" onOpen={onOpenHelp} label="Help" />}
                >
                    <Stack spacing={2}>
                        <ValidationSummary errors={generationErrors} warnings={generationWarnings} />
                        <Stack direction="row" spacing={1}>
                            <Button variant="outlined" onClick={() => setStep(4)}>
                                Back to preview
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<DownloadRoundedIcon />}
                                onClick={onDownloadZip}
                                disabled={!manifest || generationErrors.length > 0 || !Object.keys(trialSets).length}
                            >
                                Download bundle zip
                            </Button>
                        </Stack>
                        {manifest ? (
                            <Alert severity="info">
                                Subjects in bundle: {selectedSubjectIds.join(', ')}
                            </Alert>
                        ) : null}
                    </Stack>
                </PageSection>
            ) : null}
        </Stack>
    );
};

export default BundleTab;
