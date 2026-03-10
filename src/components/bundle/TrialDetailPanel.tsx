import {
    Alert,
    Box,
    Card,
    CardContent,
    Chip,
    Grid,
    Stack,
    Typography
} from '@mui/material';
import React, { useMemo } from 'react';
import { Trial } from '../../domain/trialTypes';
import { useObjectUrl } from '../common/hooks/useObjectUrl';

interface Props {
    trial: Trial | null;
    resolveMediaFile: (internalPath: string) => File | null;
    focusedIdentityId: string | null;
    identityPreviewReason: string | null;
}

const TrialDetailPanel: React.FC<Props> = ({ trial, resolveMediaFile, focusedIdentityId, identityPreviewReason }) => {
    const leftImageFile = useMemo(() => (trial ? resolveMediaFile(trial.leftImage.path) : null), [trial, resolveMediaFile]);
    const rightImageFile = useMemo(() => (trial ? resolveMediaFile(trial.rightImage.path) : null), [trial, resolveMediaFile]);
    const audioFile = useMemo(() => (trial ? resolveMediaFile(trial.audio.path) : null), [trial, resolveMediaFile]);

    const leftUrl = useObjectUrl(leftImageFile);
    const rightUrl = useObjectUrl(rightImageFile);
    const audioUrl = useObjectUrl(audioFile, 'audio/wav');

    const leftIsFocused = Boolean(trial && focusedIdentityId && trial.leftImage.identityId === focusedIdentityId);
    const rightIsFocused = Boolean(trial && focusedIdentityId && trial.rightImage.identityId === focusedIdentityId);

    if (!trial) {
        return (
            <Card>
                <CardContent>
                    <Stack spacing={1}>
                        <Typography variant="h6">Trial detail</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Select a trial to preview the audio and paired face images.
                        </Typography>
                    </Stack>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent>
                <Stack spacing={2}>
                    <div>
                        <Typography variant="h6">Trial detail</Typography>
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                            <Chip label={`#${trial.trialNumber}`} variant="outlined" />
                            <Chip label={`Call: ${trial.callIdentityId}`} variant="outlined" />
                            <Chip label={`Condition: ${trial.isPartnerCall ? 'partner' : trial.callCategory}`} variant="outlined" />
                            <Chip label={`Partner side: ${trial.partnerSide}`} variant="outlined" />
                            <Chip label={`Correct: ${trial.correctSide}`} variant="outlined" />
                            {focusedIdentityId ? <Chip label={`Focus: ${focusedIdentityId}`} color="primary" variant="outlined" /> : null}
                        </Stack>
                    </div>

                    {identityPreviewReason ? <Alert severity="info">{identityPreviewReason}</Alert> : null}

                    <Box>
                        <Typography variant="subtitle2">Audio</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {trial.audio.path}
                        </Typography>
                        {audioUrl ? (
                            <audio controls preload="none" src={audioUrl} style={{ width: '100%' }} />
                        ) : (
                            <Alert severity="error">Missing audio file for this trial.</Alert>
                        )}
                    </Box>

                    <Grid container spacing={2}>
                        {[
                            {
                                key: 'left',
                                title: 'Left image',
                                path: trial.leftImage.path,
                                url: leftUrl,
                                focused: leftIsFocused
                            },
                            {
                                key: 'right',
                                title: 'Right image',
                                path: trial.rightImage.path,
                                url: rightUrl,
                                focused: rightIsFocused
                            }
                        ].map((item) => (
                            <Grid key={item.key} item xs={12} md={6}>
                                <Typography variant="subtitle2">{item.title}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    {item.path}
                                </Typography>
                                {item.url ? (
                                    <Box
                                        component="img"
                                        src={item.url}
                                        alt={item.title}
                                        sx={{
                                            width: '100%',
                                            borderRadius: 2,
                                            border: 2,
                                            borderColor: item.focused ? 'primary.main' : 'divider'
                                        }}
                                    />
                                ) : (
                                    <Alert severity="error">Missing image file.</Alert>
                                )}
                            </Grid>
                        ))}
                    </Grid>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default TrialDetailPanel;
