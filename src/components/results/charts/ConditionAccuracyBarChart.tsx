import React from 'react';
import Plot from 'react-plotly.js';

interface Props {
    subjectId: string;
    labels: string[]; // conditions
    accuracies: (number | null)[];
}

const ConditionAccuracyBarChart: React.FC<Props> = ({ subjectId, labels, accuracies }) => {
    const vals = accuracies.map((a) => (a === null ? 0 : a));
    return (
        <div className="table-wrapper" style={{ padding: '0.5rem' }}>
            <Plot
                data={[
                    {
                        type: 'bar',
                        x: labels,
                        y: vals,
                        marker: { color: '#38bdf8' },
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
                    paper_bgcolor: '#020617',
                    plot_bgcolor: '#020617',
                    font: { color: '#e5e7eb' },
                    margin: { l: 60, r: 30, t: 60, b: 50 }
                }}
                useResizeHandler
                style={{ width: '100%', height: '300px' }}
                config={{ displayModeBar: false, responsive: true }}
            />
        </div>
    );
};

export default ConditionAccuracyBarChart;
