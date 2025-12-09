import React from 'react';

interface Props {
    csvOk: boolean;
    csvError: string | null;
}

const DataInfoWarning: React.FC<Props> = ({ csvOk, csvError }) => {
    if (csvError) {
        return (
            <div>
                <span className="badge badge-error">data_info.csv problem</span>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem', marginTop: '0.5rem' }}>
          {csvError}
        </pre>
            </div>
        );
    }

    if (csvOk) {
        return (
            <div>
                <span className="badge badge-ok">data_info.csv found and parsed successfully</span>
                <div className="small-text" style={{ marginTop: '0.25rem' }}>
                    ID column normalized to <code>ID</code>. Additional columns are preserved as properties.
                </div>
            </div>
        );
    }

    return (
        <div>
            <span className="badge badge-warn">Waiting for folder selection / CSV</span>
            <div className="small-text" style={{ marginTop: '0.25rem' }}>
                Select a folder containing <code>data_info.csv</code>, plus JPG and WAV files.
            </div>
        </div>
    );
};

export default DataInfoWarning;
