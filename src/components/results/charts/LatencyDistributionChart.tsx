import { Box, useTheme } from '@mui/material';
import React from 'react';
import Plot from 'react-plotly.js';

interface Series {
    label: string; // subject id
    latencies: number[];
    color?: string;
}

interface Props {
    series: Series[];
}

const LatencyDistributionChart: React.FC<Props> = ({ series }) => {
    const theme = useTheme();
    const data = series.map((s) => ({
        type: 'violin',
        y: s.latencies,
        name: s.label,
        box: { visible: true },
        meanline: { visible: true },
        line: { color: s.color || theme.palette.primary.light },
        fillcolor: s.color || theme.palette.primary.light
    }));
    return (
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 3, p: 1 }}>
            <Plot
                data={data}
                layout={{
                    // explicit object title
                    title: { text: 'Latency distribution per animal' },
                    yaxis: { title: { text: 'Latency (s)' } },
                    xaxis: { title: { text: 'Subject' } },
                    paper_bgcolor: theme.palette.background.paper,
                    plot_bgcolor: theme.palette.background.paper,
                    font: { color: theme.palette.text.primary },
                    margin: { l: 60, r: 30, t: 60, b: 50 }
                }}
                useResizeHandler
                style={{ width: '100%', height: '340px' }}
                config={{ displayModeBar: false, responsive: true }}
            />
        </Box>
    );
};

export default LatencyDistributionChart;
