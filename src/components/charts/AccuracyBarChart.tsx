import React from 'react';
import Plot from 'react-plotly.js';

interface Props {
    labels: string[]; // subject IDs
    accuracies: (number | null)[];
}

const AccuracyBarChart: React.FC<Props> = ({ labels, accuracies }) => {
    const vals = accuracies.map((a) => (a === null ? 0 : a));
    return (
        <div className="table-wrapper" style={{ padding: '0.5rem' }}>
            <Plot
                data={[
                    {
                        type: 'bar',
                        x: labels,
                        y: vals,
                        marker: { color: '#22c55e' },
                        name: 'Accuracy',
                        hovertemplate: '%{x}<br>Accuracy: %{y:.2f}<extra></extra>'
                    }
                ]}
                layout={{
                    title: { text: 'Accuracy per animal' },
                    yaxis: {
                        range: [0, 1],
                        title: { text: 'Accuracy' },
                        tickformat: '.0%'
                    },
                    xaxis: {
                        title: { text: 'Subject' }
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

export default AccuracyBarChart;
