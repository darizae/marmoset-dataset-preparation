import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import { Chip, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import React from 'react';
import PageSection from '../common/PageSection';
import { APP_VERSION } from '../../appMeta';

const changelogItems = [
    'Switched the app to a cleaner MUI-based shell with lighter, more consistent UI.',
    'Rebuilt bundle build/explore flows and tightened validation feedback.',
    'Added visible in-flow help, lightweight state persistence, and a reset option.',
    'Restored the preview flow so graph, media, and table are easier to scan together.',
    'Added linting, unit tests, Playwright E2E coverage, and a pre-commit hook.'
];

const ChangelogTab: React.FC = () => {
    return (
        <Stack spacing={3}>
            <PageSection
                title={`Version ${APP_VERSION}`}
                description="Compact release notes for the current app refresh."
                action={<Chip icon={<HistoryRoundedIcon />} label="Release 1.5" color="primary" variant="outlined" />}
            >
                <Stack spacing={2}>
                    <Typography variant="body1">
                        This release focuses on making the app feel more usable day to day: clearer structure, better preview flow, and less lost work between interactions.
                    </Typography>
                    <List dense sx={{ py: 0 }}>
                        {changelogItems.map((item) => (
                            <ListItem key={item} disablePadding sx={{ py: 0.5 }}>
                                <ListItemText primary={item} />
                            </ListItem>
                        ))}
                    </List>
                </Stack>
            </PageSection>
        </Stack>
    );
};

export default ChangelogTab;
