import { Box, useTheme } from '@mui/material';
import React from 'react';
import Plot from 'react-plotly.js';

interface Props {
    subjectId: string;
    labels: string[]; // conditions
    accuracies: (number | null)[];
}

const ConditionAccuracyBarChart: React.FC<Props> = ({ subjectId, labels, accuracies }) => {
    const theme = useTheme();
    const vals = accuracies.map((a) => (a === null ? 0 : a));
    return (
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 3, p: 1 }}>
            <Plot
                data={[
                    {
                        type: 'bar',
                        x: labels,
                        y: vals,
                        marker: { color: theme.palette.primary.main },
                        name: 'Accuracy',
                        hovertemplate: '%{x}<br>Accuracy: %{y:.2f}<extra></extra>'
                    }
                ]}
                layout={{
                    // explicit object for title
                    title: { text: `Per-condition accuracy (${subjectId})` },
                    yaxis: {
                        range: [0, 1],
                        title: { text: 'Accuracy' },
                        tickformat: '.0%'
                    },
                    xaxis: {
                        title: { text: 'Condition' }
                    },
                    paper_bgcolor: theme.palette.background.paper,
                    plot_bgcolor: theme.palette.background.paper,
                    font: { color: theme.palette.text.primary },
                    margin: { l: 60, r: 30, t: 60, b: 50 }
                }}
                useResizeHandler
                style={{ width: '100%', height: '300px' }}
                config={{ displayModeBar: false, responsive: true }}
            />
        </Box>
    );
};

export default ConditionAccuracyBarChart;
