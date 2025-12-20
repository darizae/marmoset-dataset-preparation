import React from 'react';

interface Props {
    onProcess: () => void;
    processing: boolean;
    canProcess: boolean;
    processError: string | null;
}

const ProcessPanel: React.FC<Props> = ({ onProcess, processing, canProcess, processError }) => {
    return (
        <div>
            <button
                className="button button-primary"
                onClick={onProcess}
                disabled={!canProcess || processing}
            >
                {processing ? 'Processing…' : 'Process dataset'}
            </button>
            {!canProcess && (
                <div className="small-text" style={{ marginTop: '0.4rem' }}>
                    You must select a folder and have a valid <code>data_info.csv</code> before processing.
                </div>
            )}
            {processError && (
                <div className="error-item" style={{ marginTop: '0.4rem' }}>
                    {processError}
                </div>
            )}
        </div>
    );
};

export default ProcessPanel;
