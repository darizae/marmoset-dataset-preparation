import { Card, CardContent, Stack, Typography } from '@mui/material';
import React from 'react';

interface Props {
    title: string;
    description?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
    compact?: boolean;
}

const PageSection: React.FC<Props> = ({ title, description, action, children, compact = false }) => {
    return (
        <Card>
            <CardContent sx={{ p: compact ? 2.5 : undefined }}>
                <Stack spacing={compact ? 2 : 3}>
                    <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={2}
                        alignItems={{ xs: 'flex-start', md: 'center' }}
                        justifyContent="space-between"
                    >
                        <div>
                            <Typography variant="h6">{title}</Typography>
                            {description ? (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                                    {description}
                                </Typography>
                            ) : null}
                        </div>
                        {action}
                    </Stack>
                    {children}
                </Stack>
            </CardContent>
        </Card>
    );
};

export default PageSection;
