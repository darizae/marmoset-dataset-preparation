import React, { Suspense, useMemo, useState } from 'react';
import AnalyticsRoundedIcon from '@mui/icons-material/AnalyticsRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import DeleteSweepRoundedIcon from '@mui/icons-material/DeleteSweepRounded';
import DatasetLinkedRoundedIcon from '@mui/icons-material/DatasetLinkedRounded';
import TravelExploreRoundedIcon from '@mui/icons-material/TravelExploreRounded';
import {
    AppBar,
    Box,
    Button,
    Chip,
    Container,
    LinearProgress,
    Paper,
    Stack,
    Tab,
    Tabs,
    Toolbar,
    Typography
} from '@mui/material';
import BundleTab from './components/bundle/BundleTab';
import HelpDrawer from './components/help/HelpDrawer';
import { HelpTopicId } from './components/help/helpTopics';
import { usePersistentState, useSessionState } from './persistence/hooks';
import { allStorageKeys, storageKeys } from './persistence/keys';
import { clearStoredValues } from './persistence/storage';
import { APP_VERSION } from './appMeta';

const ResultsTab = React.lazy(() => import('./components/results/ResultsTab'));
const BundleExploreTab = React.lazy(() => import('./components/bundle/BundleExploreTab'));
const ChangelogTab = React.lazy(() => import('./components/changelog/ChangelogTab'));

type TabId = 'build' | 'explore' | 'results' | 'changelog';

const tabMeta: Record<TabId, { title: string; description: string }> = {
    build: {
        title: 'Build bundle',
        description: 'Prepare a dataset, confirm eligible subjects, generate trials, and export one deployable bundle.'
    },
    explore: {
        title: 'Explore bundle',
        description: 'Load an existing bundle directory, inspect subjects, and verify that media and trial structure match expectations.'
    },
    results: {
        title: 'Analyze results',
        description: 'Upload CSV or JSONL outputs, review parse issues, and inspect summary metrics by subject.'
    },
    changelog: {
        title: 'Changelog',
        description: 'Short release notes for the current version of the app.'
    }
};

const App: React.FC = () => {
    const [activeTab, setActiveTab] = usePersistentState<TabId>(storageKeys.appPreferences, 'build');
    const [helpTopicId, setHelpTopicId] = useState<HelpTopicId | null>(null);
    const [helpOpen, setHelpOpen] = useState(false);
    const [, setSessionResetNonce] = useSessionState<number>(storageKeys.appSession, 0);

    const activeMeta = useMemo(() => tabMeta[activeTab], [activeTab]);

    const openHelp = (topicId: HelpTopicId) => {
        setHelpTopicId(topicId);
        setHelpOpen(true);
    };

    const clearSavedState = () => {
        clearStoredValues(allStorageKeys);
        setSessionResetNonce(Date.now());
        window.location.reload();
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 6 }}>
            <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Toolbar sx={{ py: 2 }}>
                    <Stack spacing={0.75} sx={{ width: '100%' }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
                            <Typography variant="h4">Marmoset Dataset Preparation</Typography>
                            <Chip label={`Version ${APP_VERSION}`} color="primary" variant="outlined" />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                            Modernized build, validation, analysis, and preview workflow for trial bundles and experiment outputs.
                        </Typography>
                    </Stack>
                </Toolbar>
            </AppBar>

            <Container maxWidth="xl" sx={{ pt: 4 }}>
                <Stack spacing={3}>
                    <Paper sx={{ p: 1 }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between">
                            <Tabs value={activeTab} onChange={(_, value: TabId) => setActiveTab(value)} variant="scrollable">
                                <Tab icon={<DatasetLinkedRoundedIcon />} iconPosition="start" label="Build bundle" value="build" />
                                <Tab icon={<TravelExploreRoundedIcon />} iconPosition="start" label="Explore bundle" value="explore" />
                                <Tab icon={<AnalyticsRoundedIcon />} iconPosition="start" label="Analyze results" value="results" />
                                <Tab icon={<HistoryRoundedIcon />} iconPosition="start" label="Changelog" value="changelog" />
                            </Tabs>
                            <Button
                                variant="text"
                                color="inherit"
                                startIcon={<DeleteSweepRoundedIcon />}
                                onClick={clearSavedState}
                            >
                                Clear saved app state
                            </Button>
                        </Stack>
                    </Paper>

                    <Paper sx={{ p: { xs: 2.5, md: 4 } }}>
                        <Stack spacing={1}>
                            <Typography variant="h5">{activeMeta.title}</Typography>
                            <Typography variant="body1" color="text.secondary">
                                {activeMeta.description}
                            </Typography>
                        </Stack>
                    </Paper>

                    {activeTab === 'build' ? (
                        <BundleTab onOpenHelp={openHelp} />
                    ) : (
                        <Suspense fallback={<LinearProgress />}>
                            {activeTab === 'explore' ? <BundleExploreTab onOpenHelp={openHelp} /> : null}
                            {activeTab === 'results' ? <ResultsTab onOpenHelp={openHelp} /> : null}
                            {activeTab === 'changelog' ? <ChangelogTab /> : null}
                        </Suspense>
                    )}
                </Stack>
            </Container>

            <HelpDrawer open={helpOpen} topicId={helpTopicId} onClose={() => setHelpOpen(false)} />
        </Box>
    );
};

export default App;
