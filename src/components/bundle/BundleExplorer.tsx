import {
    Alert,
    Box,
    Card,
    CardContent,
    Divider,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    Typography,
    useMediaQuery,
    useTheme
} from '@mui/material';
import React, { Suspense, useCallback, useMemo } from 'react';
import { Trial, TrialSet } from '../../domain/trialTypes';
import TrialDetailPanel from './TrialDetailPanel';
import MetricChips from '../common/MetricChips';
import ValidationSummary from '../common/ValidationSummary';
import { resolveSelectedTrialId } from './explorerSelection';
import { usePersistentState, useSessionState } from '../../persistence/hooks';
import { storageKeys } from '../../persistence/keys';

type ConditionLabel = 'partner' | 'familiar_non_partner' | 'unfamiliar' | 'unknown';
type Side = 'left' | 'right';
type MobilePanel = 'overview' | 'trials' | 'media';

interface Props {
    trialSets: Record<string, TrialSet>;
    resolveMediaFile: (internalPath: string) => File | null;
    strictErrors: string[];
    warnings: string[];
    persistenceKey: string;
}

type TrialPreviewPick = {
    trialId: string | null;
    reason: string | null;
};

const TrialGraphView = React.lazy(() => import('./TrialGraphView'));

function deriveCondition(isPartnerCall: boolean, callCategory: string): ConditionLabel {
    if (isPartnerCall) return 'partner';
    const c = String(callCategory || '').toLowerCase();
    if (c === 'familiar') return 'familiar_non_partner';
    if (c === 'unfamiliar') return 'unfamiliar';
    return 'unknown';
}

function matchesFilters(
    trial: Trial,
    focusedIdentityId: string | null,
    conditionFilter: ConditionLabel | 'all',
    callIdentityFilter: string,
    partnerSideFilter: Side | 'all',
    correctSideFilter: Side | 'all'
): boolean {
    if (
        focusedIdentityId &&
        trial.otherIdentityId !== focusedIdentityId &&
        trial.callIdentityId !== focusedIdentityId &&
        trial.partnerId !== focusedIdentityId
    ) {
        return false;
    }
    if (conditionFilter !== 'all' && deriveCondition(trial.isPartnerCall, trial.callCategory) !== conditionFilter) {
        return false;
    }
    if (callIdentityFilter !== 'all' && trial.callIdentityId !== callIdentityFilter) return false;
    if (partnerSideFilter !== 'all' && trial.partnerSide !== partnerSideFilter) return false;
    if (correctSideFilter !== 'all' && trial.correctSide !== correctSideFilter) return false;
    return true;
}

function pickTrialForIdentity(trials: Trial[], identityId: string): TrialPreviewPick {
    const byCall = trials.find((trial) => trial.callIdentityId === identityId);
    if (byCall) return { trialId: byCall.trialId, reason: null };

    const byImage = trials.find((trial) => trial.leftImage.identityId === identityId || trial.rightImage.identityId === identityId);
    if (byImage) {
        return {
            trialId: byImage.trialId,
            reason: 'No call trial is available under the current filters; previewing a trial where this identity appears as an image.'
        };
    }

    return { trialId: null, reason: 'No trials match this identity under the current filters.' };
}

const BundleExplorer: React.FC<Props> = ({ trialSets, resolveMediaFile, strictErrors, warnings, persistenceKey }) => {
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up('xl'));
    const subjectIds = useMemo(() => Object.keys(trialSets).sort(), [trialSets]);

    const [selectedSubjectId, setSelectedSubjectId] = useSessionState<string>(`${persistenceKey}.subject`, subjectIds[0] || '');
    const [selectedIdentityId, setSelectedIdentityId] = useSessionState<string | null>(`${persistenceKey}.identity`, null);
    const [selectedTrialId, setSelectedTrialId] = useSessionState<string | null>(`${persistenceKey}.trial`, null);
    const [selectedIdentityPreviewReason, setSelectedIdentityPreviewReason] = useSessionState<string | null>(`${persistenceKey}.reason`, null);
    const [conditionFilter, setConditionFilter] = useSessionState<ConditionLabel | 'all'>(`${persistenceKey}.condition`, 'all');
    const [callIdentityFilter, setCallIdentityFilter] = useSessionState<string>(`${persistenceKey}.callIdentity`, 'all');
    const [partnerSideFilter, setPartnerSideFilter] = useSessionState<Side | 'all'>(`${persistenceKey}.partnerSide`, 'all');
    const [correctSideFilter, setCorrectSideFilter] = useSessionState<Side | 'all'>(`${persistenceKey}.correctSide`, 'all');
    const [mobilePanel, setMobilePanel] = usePersistentState<MobilePanel>(`${storageKeys.appPreferences}.previewPanel`, 'overview');

    const trialSet = selectedSubjectId && trialSets[selectedSubjectId] ? trialSets[selectedSubjectId] : trialSets[subjectIds[0]] || null;

    const callIdentityOptions = useMemo(() => {
        if (!trialSet) return [];
        return Array.from(new Set(trialSet.trials.map((trial) => trial.callIdentityId))).sort();
    }, [trialSet]);

    const filteredTrials = useMemo(() => {
        if (!trialSet) return [];
        return trialSet.trials.filter((trial) =>
            matchesFilters(trial, selectedIdentityId, conditionFilter, callIdentityFilter, partnerSideFilter, correctSideFilter)
        );
    }, [trialSet, selectedIdentityId, conditionFilter, callIdentityFilter, partnerSideFilter, correctSideFilter]);

    const activeTrialId = useMemo(
        () => resolveSelectedTrialId(filteredTrials, selectedTrialId),
        [filteredTrials, selectedTrialId]
    );

    const selectedTrial = useMemo(() => {
        if (!trialSet || !activeTrialId) return null;
        return filteredTrials.find((trial) => trial.trialId === activeTrialId) || null;
    }, [activeTrialId, filteredTrials, trialSet]);

    const summary = useMemo(() => {
        if (!trialSet) return null;
        const counts: Record<ConditionLabel, number> = { partner: 0, familiar_non_partner: 0, unfamiliar: 0, unknown: 0 };
        for (const trial of trialSet.trials) {
            counts[deriveCondition(trial.isPartnerCall, trial.callCategory)] += 1;
        }
        return counts;
    }, [trialSet]);

    const validationCollapsed = useMemo(() => {
        if (!strictErrors.length && !warnings.length) {
            return null;
        }
        return `${strictErrors.length} blocking issue(s), ${warnings.length} warning(s)`;
    }, [strictErrors.length, warnings.length]);

    const onSelectSubject = (subjectId: string) => {
        setSelectedSubjectId(subjectId);
        setSelectedIdentityId(null);
        setSelectedTrialId(null);
        setSelectedIdentityPreviewReason(null);
        setConditionFilter('all');
        setCallIdentityFilter('all');
        setPartnerSideFilter('all');
        setCorrectSideFilter('all');
    };

    const onSelectIdentity = useCallback((identityId: string) => {
        setSelectedIdentityId(identityId);

        if (!trialSet) {
            setSelectedTrialId(null);
            setSelectedIdentityPreviewReason(null);
            return;
        }

        const eligibleTrials = trialSet.trials
            .filter((trial) => matchesFilters(trial, identityId, conditionFilter, callIdentityFilter, partnerSideFilter, correctSideFilter))
            .sort((left, right) => left.trialNumber - right.trialNumber);

        const pick = pickTrialForIdentity(eligibleTrials, identityId);
        setSelectedTrialId(pick.trialId);
        setSelectedIdentityPreviewReason(pick.reason);
        setMobilePanel('media');
    }, [trialSet, conditionFilter, callIdentityFilter, partnerSideFilter, correctSideFilter, setMobilePanel, setSelectedIdentityId, setSelectedIdentityPreviewReason, setSelectedTrialId]);

    const onSelectTrial = (trial: Trial) => {
        setSelectedTrialId(trial.trialId);
        setSelectedIdentityPreviewReason(null);
        setMobilePanel('media');
    };

    const clearFocus = () => {
        setSelectedIdentityId(null);
        setSelectedTrialId(null);
        setSelectedIdentityPreviewReason(null);
    };

    if (!trialSet) {
        return <Alert severity="info">No trial sets available.</Alert>;
    }

    const filterToolbar = (
        <Stack spacing={1.5}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
                <FormControl sx={{ minWidth: 220 }}>
                    <InputLabel id={`${persistenceKey}-subject-select-label`}>Subject</InputLabel>
                    <Select
                        labelId={`${persistenceKey}-subject-select-label`}
                        label="Subject"
                        value={trialSet.meta.subjectId}
                        onChange={(event) => onSelectSubject(event.target.value)}
                    >
                        {subjectIds.map((subjectId) => (
                            <MenuItem key={subjectId} value={subjectId}>{subjectId}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <MetricChips
                    items={[
                        { label: 'Partner', value: trialSet.meta.partnerId },
                        { label: 'Trials', value: trialSet.trials.length },
                        { label: 'Visible', value: filteredTrials.length }
                    ]}
                />
            </Stack>

            {selectedIdentityId ? (
                <Alert
                    severity="info"
                    action={
                        <Box component="button" onClick={clearFocus} sx={{ border: 0, bgcolor: 'transparent', color: 'primary.main', cursor: 'pointer' }}>
                            Clear focus
                        </Box>
                    }
                >
                    Focused identity: {selectedIdentityId}
                </Alert>
            ) : null}

            {validationCollapsed ? (
                <Alert severity={strictErrors.length > 0 ? 'error' : 'warning'}>
                    {validationCollapsed}
                </Alert>
            ) : null}
        </Stack>
    );

    const filterControls = (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} useFlexGap flexWrap="wrap">
            <FormControl sx={{ minWidth: 180 }}>
                <InputLabel id={`${persistenceKey}-condition-filter-label`}>Condition</InputLabel>
                <Select
                    labelId={`${persistenceKey}-condition-filter-label`}
                    label="Condition"
                    value={conditionFilter}
                    onChange={(event) => setConditionFilter(event.target.value as ConditionLabel | 'all')}
                >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="partner">Partner</MenuItem>
                    <MenuItem value="familiar_non_partner">Familiar non-partner</MenuItem>
                    <MenuItem value="unfamiliar">Unfamiliar</MenuItem>
                    <MenuItem value="unknown">Unknown</MenuItem>
                </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 180 }}>
                <InputLabel id={`${persistenceKey}-call-filter-label`}>Call identity</InputLabel>
                <Select
                    labelId={`${persistenceKey}-call-filter-label`}
                    label="Call identity"
                    value={callIdentityFilter}
                    onChange={(event) => setCallIdentityFilter(event.target.value)}
                >
                    <MenuItem value="all">All</MenuItem>
                    {callIdentityOptions.map((id) => (
                        <MenuItem key={id} value={id}>{id}</MenuItem>
                    ))}
                </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 140 }}>
                <InputLabel id={`${persistenceKey}-partner-side-filter-label`}>Partner side</InputLabel>
                <Select
                    labelId={`${persistenceKey}-partner-side-filter-label`}
                    label="Partner side"
                    value={partnerSideFilter}
                    onChange={(event) => setPartnerSideFilter(event.target.value as Side | 'all')}
                >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="left">Left</MenuItem>
                    <MenuItem value="right">Right</MenuItem>
                </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 140 }}>
                <InputLabel id={`${persistenceKey}-correct-side-filter-label`}>Correct side</InputLabel>
                <Select
                    labelId={`${persistenceKey}-correct-side-filter-label`}
                    label="Correct side"
                    value={correctSideFilter}
                    onChange={(event) => setCorrectSideFilter(event.target.value as Side | 'all')}
                >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="left">Left</MenuItem>
                    <MenuItem value="right">Right</MenuItem>
                </Select>
            </FormControl>
        </Stack>
    );

    const overviewContent = (
        <Card>
            <CardContent sx={{ p: 2.5 }}>
                <Stack spacing={2}>
                    <Stack spacing={0.5}>
                        <Typography variant="h6">Identity relationship view</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Keep the graph in view while scanning trials and previewing media.
                        </Typography>
                    </Stack>
                    <Suspense fallback={<Typography variant="body2">Loading graph…</Typography>}>
                        <TrialGraphView trialSet={trialSet} onSelectIdentity={onSelectIdentity} selectedIdentityId={selectedIdentityId} />
                    </Suspense>
                    {summary ? (
                        <MetricChips
                            items={[
                                { label: 'Partner', value: summary.partner },
                                { label: 'Familiar non-partner', value: summary.familiar_non_partner },
                                { label: 'Unfamiliar', value: summary.unfamiliar },
                                { label: 'Unknown', value: summary.unknown }
                            ]}
                        />
                    ) : null}
                </Stack>
            </CardContent>
        </Card>
    );

    const trialsContent = (
        <Card>
            <CardContent sx={{ p: 2.5 }}>
                <Stack spacing={2}>
                    <Stack spacing={0.75}>
                        <Typography variant="h6">Trial browser</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Filters stay compact so the graph and media remain visible.
                        </Typography>
                    </Stack>
                    {filterControls}
                    <Divider />
                    <TableContainer sx={{ maxHeight: isDesktop ? 420 : 360 }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>#</TableCell>
                                    <TableCell>Call</TableCell>
                                    <TableCell>Condition</TableCell>
                                    <TableCell>Other</TableCell>
                                    <TableCell>Partner side</TableCell>
                                    <TableCell>Correct</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredTrials.slice(0, 200).map((trial) => (
                                    <TableRow
                                        key={trial.trialId}
                                        hover
                                        selected={activeTrialId === trial.trialId}
                                        onClick={() => onSelectTrial(trial)}
                                        sx={{ cursor: 'pointer' }}
                                    >
                                        <TableCell>{trial.trialNumber}</TableCell>
                                        <TableCell>{trial.callIdentityId}</TableCell>
                                        <TableCell>{deriveCondition(trial.isPartnerCall, trial.callCategory)}</TableCell>
                                        <TableCell>{trial.otherIdentityId}</TableCell>
                                        <TableCell>{trial.partnerSide}</TableCell>
                                        <TableCell>{trial.correctSide}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Typography variant="body2" color="text.secondary">
                        Showing {Math.min(200, filteredTrials.length)} of {filteredTrials.length} filtered trials.
                    </Typography>
                </Stack>
            </CardContent>
        </Card>
    );

    const mediaContent = (
        <Box sx={{ position: { xl: 'sticky' }, top: { xl: 24 }, alignSelf: 'flex-start' }}>
            <TrialDetailPanel
                trial={selectedTrial}
                resolveMediaFile={resolveMediaFile}
                focusedIdentityId={selectedIdentityId}
                identityPreviewReason={activeTrialId === selectedTrialId ? selectedIdentityPreviewReason : null}
            />
        </Box>
    );

    return (
        <Stack spacing={2.5}>
            {filterToolbar}

            {isDesktop ? (
                <Stack direction="row" spacing={2.5} alignItems="flex-start">
                    <Stack spacing={2} sx={{ flex: 1.35, minWidth: 0 }}>
                        {overviewContent}
                        {trialsContent}
                        <ValidationSummary errors={strictErrors} warnings={warnings} />
                    </Stack>
                    <Box sx={{ flex: 0.95, minWidth: 380 }}>
                        {mediaContent}
                    </Box>
                </Stack>
            ) : (
                <Stack spacing={2}>
                    <Tabs value={mobilePanel} onChange={(_, value: MobilePanel) => setMobilePanel(value)} variant="fullWidth">
                        <Tab label="Overview" value="overview" />
                        <Tab label="Trials" value="trials" />
                        <Tab label="Media" value="media" />
                    </Tabs>
                    {mobilePanel === 'overview' ? overviewContent : null}
                    {mobilePanel === 'trials' ? trialsContent : null}
                    {mobilePanel === 'media' ? mediaContent : null}
                    <ValidationSummary errors={strictErrors} warnings={warnings} />
                </Stack>
            )}
        </Stack>
    );
};

export default BundleExplorer;
