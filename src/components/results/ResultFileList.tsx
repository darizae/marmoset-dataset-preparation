import React from 'react';
import { ParsedResultFile } from '../../domain/resultsTypes';

interface Props {
    files: ParsedResultFile[];
    onRemove?: (fileName: string) => void;
}

const ResultFileList: React.FC<Props> = ({ files, onRemove }) => {
    if (!files.length) {
        return <div className="small-text">No result files loaded yet.</div>;
    }

    return (
        <div className="table-wrapper">
            <table>
                <thead>
                <tr>
                    <th>File</th>
                    <th>Format</th>
                    <th>Subject(s)</th>
                    <th>Session(s)</th>
                    <th>Total rows</th>
                    <th>Eligible</th>
                </tr>
                </thead>
                <tbody>
                {files.map((f) => (
                    <tr key={f.fileName}>
                        <td>
                            {f.fileName}
                            {onRemove && (
                                <button
                                    className="button"
                                    style={{ marginLeft: '0.5rem', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                    onClick={() => onRemove(f.fileName)}
                                >
                                    Remove
                                </button>
                            )}
                        </td>
                        <td>{f.format}</td>
                        <td>{f.subjects.join(', ') || '—'}</td>
                        <td>{f.sessionIds.join(', ') || '—'}</td>
                        <td>{f.totalRows}</td>
                        <td>{f.eligibleRows}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};

export default ResultFileList;
