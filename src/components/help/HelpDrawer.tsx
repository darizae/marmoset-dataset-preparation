import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import {
    Box,
    Divider,
    Drawer,
    IconButton,
    Stack,
    Typography
} from '@mui/material';
import { HelpTopicId, helpTopics } from './helpTopics';

interface Props {
    open: boolean;
    topicId: HelpTopicId | null;
    onClose: () => void;
}

const HelpDrawer: React.FC<Props> = ({ open, topicId, onClose }) => {
    const topic = topicId ? helpTopics[topicId] : null;

    return (
        <Drawer anchor="right" open={open} onClose={onClose}>
            <Box sx={{ width: 360, p: 3 }}>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
                    <Box>
                        <Typography variant="h6">{topic?.title ?? 'Help'}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {topic?.summary ?? 'Select a help topic from the workflow.'}
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} aria-label="Close help">
                        <CloseRoundedIcon />
                    </IconButton>
                </Stack>

                {topic?.sections.map((section) => (
                    <Box key={section.heading} sx={{ mt: 3 }}>
                        <Divider sx={{ mb: 2 }} />
                        <Typography variant="subtitle1" sx={{ mb: 1 }}>
                            {section.heading}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {section.body}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Drawer>
    );
};

export default HelpDrawer;
