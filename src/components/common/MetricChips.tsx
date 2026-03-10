import { Chip, Stack } from '@mui/material';

interface Props {
    items: { label: string; value: string | number }[];
}

const MetricChips: React.FC<Props> = ({ items }) => {
    return (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {items.map((item) => (
                <Chip key={item.label} label={`${item.label}: ${item.value}`} variant="outlined" />
            ))}
        </Stack>
    );
};

export default MetricChips;
