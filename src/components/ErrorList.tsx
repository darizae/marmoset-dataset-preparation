import React from 'react';
import { DatasetWarning, FileError } from '../domain/types';

interface Props {
    warnings: DatasetWarning[];
    fileErrors: FileError[];
}

const ErrorList: React.FC<Props> = ({ warnings, fileErrors }) => {
    const hasWarnings = warnings.length > 0;
    const hasErrors = fileErrors.length > 0;

    if (!hasWarnings && !hasErrors) {
        return (
            <div className="small-text" style={{ marginTop: '0.5rem' }}>
                No warnings or file-level errors so far.
            </div>
        );
    }

    return (
        <div style={{ marginTop: '0.75rem' }}>
            {hasWarnings && (
                <div>
                    <div className="label">Warnings (non-fatal, but important):</div>
                    <ul className="warning-list">
                        {warnings.map((w, idx) => (
                            <li key={idx} className="warning-item">
                                {w.message}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {hasErrors && (
                <div style={{ marginTop: '0.75rem' }}>
                    <div className="label">File naming / parsing errors (strict):</div>
                    <ul className="error-list">
                        {fileErrors.map((e, idx) => (
                            <li key={idx} className="error-item">
                                <strong>{e.relativePath}</strong>: {e.message}
                            </li>
                        ))}
                    </ul>
                    <div className="small-text">
                        Fix these file names or remove the offending files, then re-run processing.
                    </div>
                </div>
            )}
        </div>
    );
};

export default ErrorList;
