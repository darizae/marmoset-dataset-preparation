import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import { Button, Tooltip } from '@mui/material';
import { HelpTopicId } from './helpTopics';

interface Props {
    topicId: HelpTopicId;
    onOpen: (topicId: HelpTopicId) => void;
    label?: string;
    compact?: boolean;
}

const ContextHelpButton: React.FC<Props> = ({ topicId, onOpen, label = 'Help', compact = false }) => {
    return (
        <Tooltip title={label}>
            <Button
                size={compact ? 'small' : 'medium'}
                variant={compact ? 'text' : 'outlined'}
                color="primary"
                data-testid={`help-trigger-${topicId}`}
                startIcon={<HelpOutlineRoundedIcon fontSize="small" />}
                onClick={() => onOpen(topicId)}
                aria-label={label}
                sx={compact ? { px: 1 } : undefined}
            >
                {compact ? 'Help' : label}
            </Button>
        </Tooltip>
    );
};

export default ContextHelpButton;
