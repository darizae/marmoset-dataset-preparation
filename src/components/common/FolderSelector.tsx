import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import { Box, Button, Stack, Typography } from '@mui/material';
import React, { useId } from 'react';

interface Props {
    onFolderChange: (files: FileList | null) => void;
    folderLabel: string;
    label?: string;
    helperText?: string;
    inputTestId?: string;
}

const FolderSelector: React.FC<Props> = ({ onFolderChange, folderLabel, label = 'Select folder', helperText, inputTestId = 'folder-input' }) => {
    const inputId = useId();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onFolderChange(e.target.files);
    };

    return (
        <Stack spacing={1.5}>
            <input
                id={inputId}
                type="file"
                hidden
                data-testid={inputTestId}
                // @ts-expect-error webkitdirectory is non-standard but supported in modern browsers
                webkitdirectory=""
                multiple
                onChange={handleChange}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                <Button component="label" htmlFor={inputId} variant="contained" startIcon={<UploadFileRoundedIcon />}>
                    {label}
                </Button>
                <Box>
                    <Typography variant="body2">Selected folder</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {folderLabel}
                    </Typography>
                </Box>
            </Stack>
            {helperText ? (
                <Typography variant="body2" color="text.secondary">
                    {helperText}
                </Typography>
            ) : null}
        </Stack>
    );
};

export default FolderSelector;
