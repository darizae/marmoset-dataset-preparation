import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { Alert, AlertTitle, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import React from 'react';
import { DatasetWarning, FileError } from '../../domain/types';

interface Props {
    warnings: DatasetWarning[];
    fileErrors: FileError[];
}

const ErrorList: React.FC<Props> = ({ warnings, fileErrors }) => {
    const hasWarnings = warnings.length > 0;
    const hasErrors = fileErrors.length > 0;

    if (!hasWarnings && !hasErrors) {
        return (
            <Typography variant="body2" color="text.secondary">
                No warnings or file-level errors detected.
            </Typography>
        );
    }

    return (
        <Stack spacing={2}>
            {hasWarnings && (
                <Alert severity="warning" icon={<WarningAmberRoundedIcon />}>
                    <AlertTitle>Warnings</AlertTitle>
                    <List dense disablePadding>
                        {warnings.map((warning, idx) => (
                            <ListItem key={`${warning.message}-${idx}`} disableGutters>
                                <ListItemText primary={warning.message} />
                            </ListItem>
                        ))}
                    </List>
                </Alert>
            )}
            {hasErrors && (
                <Alert severity="error" icon={<ErrorOutlineRoundedIcon />}>
                    <AlertTitle>Strict file errors</AlertTitle>
                    <List dense disablePadding>
                        {fileErrors.map((error, idx) => (
                            <ListItem key={`${error.relativePath}-${idx}`} disableGutters>
                                <ListItemText primary={`${error.relativePath}: ${error.message}`} />
                            </ListItem>
                        ))}
                    </List>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        Fix these files and reprocess the dataset before generating trials.
                    </Typography>
                </Alert>
            )}
        </Stack>
    );
};

export default ErrorList;
