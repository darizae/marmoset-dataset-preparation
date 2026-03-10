import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { Alert, Stack } from '@mui/material';

interface Props {
    errors?: string[];
    warnings?: string[];
}

const ValidationSummary: React.FC<Props> = ({ errors = [], warnings = [] }) => {
    if (!errors.length && !warnings.length) {
        return null;
    }

    return (
        <Stack spacing={1.5}>
            {errors.length > 0 ? (
                <Alert icon={<ErrorOutlineRoundedIcon />} severity="error">
                    {errors.length === 1 ? errors[0] : `${errors.length} blocking issues detected.`}
                </Alert>
            ) : null}
            {warnings.length > 0 ? (
                <Alert icon={<WarningAmberRoundedIcon />} severity="warning">
                    {warnings.length === 1 ? warnings[0] : `${warnings.length} warnings need review.`}
                </Alert>
            ) : null}
        </Stack>
    );
};

export default ValidationSummary;
