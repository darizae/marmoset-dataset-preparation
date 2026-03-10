import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { Alert, IconButton } from '@mui/material';

interface Props {
    visible: boolean;
    onDismiss: () => void;
}

const HelpHint: React.FC<Props> = ({ visible, onDismiss }) => {
    if (!visible) {
        return null;
    }

    return (
        <Alert
            icon={<AutoAwesomeRoundedIcon />}
            severity="info"
            action={
                <IconButton color="inherit" size="small" onClick={onDismiss} aria-label="Dismiss help hint">
                    <CloseRoundedIcon fontSize="small" />
                </IconButton>
            }
        >
            Need guidance? Use the Help buttons in each section.
        </Alert>
    );
};

export default HelpHint;
