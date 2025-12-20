import React from 'react';
import { DatasetManifest, IdentityDatasetEntry } from '../../domain/types';

interface Props {
    manifest: DatasetManifest | null;
}

const SummaryTable: React.FC<Props> = ({ manifest }) => {
    if (!manifest) {
        return (
            <div className="small-text">
                No manifest yet. Run processing to see per-identity counts. The table will only include IDs
                defined in <code>data_info.csv</code>.
            </div>
        );
    }

    const rows: IdentityDatasetEntry[] = manifest.identities;

    if (rows.length === 0) {
        return <div className="small-text">No identities found in data_info.csv.</div>;
    }

    return (
        <div className="table-wrapper">
            <table>
                <thead>
                <tr>
                    <th>ID</th>
                    <th>Images</th>
                    <th>Audios</th>
                    <th>Images OK?</th>
                    <th>Audios OK?</th>
                    <th>Example image paths</th>
                    <th>Example audio paths</th>
                </tr>
                </thead>
                <tbody>
                {rows.map((r) => {
                    const imgStatus = r.hasEnoughImages ? 'OK' : 'MISSING';
                    const audStatus = r.hasEnoughAudios ? 'OK' : 'MISSING';
                    const imgBadgeClass = r.hasEnoughImages ? 'badge-ok' : 'badge-warn';
                    const audBadgeClass = r.hasEnoughAudios ? 'badge-ok' : 'badge-warn';

                    const imgExamples = r.imageExemplars.slice(0, 2).map((e) => e.relativePath);
                    const audExamples = r.audioExemplars.slice(0, 2).map((e) => e.relativePath);

                    return (
                        <tr key={r.id}>
                            <td>{r.id}</td>
                            <td>
                                {r.nImageExemplars} / {r.expectedMinImages}
                            </td>
                            <td>
                                {r.nAudioExemplars} / {r.expectedMinAudios}
                            </td>
                            <td>
                  <span className={`badge ${imgBadgeClass}`} style={{ fontSize: '0.7rem' }}>
                    {imgStatus}
                  </span>
                            </td>
                            <td>
                  <span className={`badge ${audBadgeClass}`} style={{ fontSize: '0.7rem' }}>
                    {audStatus}
                  </span>
                            </td>
                            <td className={imgExamples.length ? '' : 'muted'}>
                                {imgExamples.length ? imgExamples.join(', ') : '—'}
                            </td>
                            <td className={audExamples.length ? '' : 'muted'}>
                                {audExamples.length ? audExamples.join(', ') : '—'}
                            </td>
                        </tr>
                    );
                })}
                </tbody>
            </table>
        </div>
    );
};

export default SummaryTable;
