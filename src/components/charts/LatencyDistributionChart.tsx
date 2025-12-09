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
    const data = series.map((s, idx) => ({
        type: 'violin',
        y: s.latencies,
        name: s.label,
        box: { visible: true },
        meanline: { visible: true },
        line: { color: s.color || undefined },
        fillcolor: s.color || undefined
    }));
    return (
        <div className="table-wrapper" style={{ padding: '0.5rem' }}>
            <Plot
                data={data}
                layout={{
                    title: 'Latency distribution per animal',
                    yaxis: { title: 'Latency (s)' },
                    paper_bgcolor: '#020617',
                    plot_bgcolor: '#020617',
                    font: { color: '#e5e7eb' },
                    margin: { l: 50, r: 20, t: 40, b: 40 }
                }}
                useResizeHandler
                style={{ width: '100%', height: '340px' }}
                config={{ displayModeBar: false, responsive: true }}
            />
        </div>
    );
};

export default LatencyDistributionChart;
