import React, { useCallback, useMemo, useState } from 'react';
import { parseDataInfoCsv } from './domain/csvParser';
import { buildDatasetManifest } from './domain/datasetBuilder';
import {
    BuildDatasetResult,
    CsvIdentityRow,
    DatasetManifest,
    DatasetWarning,
    FileError
} from './domain/types';
import FolderSelector from './components/FolderSelector';
import DataInfoWarning from './components/DataInfoWarning';
import SettingsPanel from './components/SettingsPanel';
import SummaryTable from './components/SummaryTable';
import ErrorList from './components/ErrorList';
import ProcessPanel from './components/ProcessPanel';
import ExportPanel from './components/ExportPanel';

function inferFolderLabel(files: File[]): string {
    if (!files.length) return 'No folder selected';
    const anyFile = files[0] as any;
    const rel = typeof anyFile.webkitRelativePath === 'string' ? anyFile.webkitRelativePath : files[0].name;
    if (!rel || !rel.includes('/')) return rel || 'Selected folder';
    return rel.split('/')[0];
}

const App: React.FC = () => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [folderLabel, setFolderLabel] = useState<string>('No folder selected');

    const [csvRows, setCsvRows] = useState<CsvIdentityRow[] | null>(null);
    const [csvError, setCsvError] = useState<string | null>(null);
    const [csvOk, setCsvOk] = useState<boolean>(false);

    const [expectedImages, setExpectedImages] = useState<number>(5);
    const [expectedAudios, setExpectedAudios] = useState<number>(5);

    const [processing, setProcessing] = useState<boolean>(false);
    const [processError, setProcessError] = useState<string | null>(null);
    const [result, setResult] = useState<BuildDatasetResult | null>(null);

    const [generalWarnings, setGeneralWarnings] = useState<DatasetWarning[]>([]);
    const [fileErrors, setFileErrors] = useState<FileError[]>([]);

    const handleFolderChange = useCallback((files: FileList | null) => {
        // Full reset of folder-dependent state
        setSelectedFiles([]);
        setFolderLabel('No folder selected');
        setCsvRows(null);
        setCsvError(null);
        setCsvOk(false);
        setResult(null);
        setProcessError(null);
        setGeneralWarnings([]);
        setFileErrors([]);

        if (!files || files.length === 0) {
            return;
        }
        const arr = Array.from(files);
        setSelectedFiles(arr);
        setFolderLabel(inferFolderLabel(arr));

        const dataInfoFile = arr.find((f) => f.name === 'data_info.csv');
        if (!dataInfoFile) {
            setCsvError(
                [
                    'Required file "data_info.csv" was not found directly inside the selected folder.',
                    '',
                    'The file must be named exactly: data_info.csv',
                    'Expected columns include (at minimum):',
                    '  - ID (string; animal identity, letters only, e.g. "A", "B", "Odin")',
                    '  - familiarity (string; e.g. "familiar" or "unfamiliar")',
                    '  - partner_ID (string; ID of partner or empty)',
                    '  - sex (string; e.g. "m" or "f")',
                    '  - focal (integer; 1 for focal/subject animals, 0 otherwise)',
                    '',
                    'Additional columns are allowed and will be preserved as properties.',
                    'Place data_info.csv directly in the selected folder alongside JPG and WAV files.'
                ].join('\n')
            );
            return;
        }

        parseDataInfoCsv(dataInfoFile)
            .then((parsed) => {
                setCsvRows(parsed.rows);
                setCsvError(null);
                setCsvOk(true);
            })
            .catch((err) => {
                setCsvError(`Failed to parse data_info.csv: ${err.message}`);
                setCsvOk(false);
            });
    }, []);

    const folderSummary = useMemo(() => {
        const summary = {
            totalFiles: selectedFiles.length,
            csvCount: selectedFiles.filter((f) => f.name === 'data_info.csv').length,
            jpgCount: selectedFiles.filter((f) => f.name.toLowerCase().endsWith('.jpg')).length,
            wavCount: selectedFiles.filter((f) => f.name.toLowerCase().endsWith('.wav')).length
        };
        return summary;
    }, [selectedFiles]);

    const handleProcess = useCallback(() => {
        setProcessError(null);
        setGeneralWarnings([]);
        setFileErrors([]);
        setResult(null);

        if (!csvRows) {
            setProcessError('Cannot process: data_info.csv is missing or could not be parsed successfully.');
            return;
        }
        if (!selectedFiles.length) {
            setProcessError('Cannot process: no folder/files selected.');
            return;
        }

        setProcessing(true);
        try {
            const manifestResult = buildDatasetManifest({
                csvRows,
                dataDirLabel: folderLabel,
                files: selectedFiles,
                expectedImages,
                expectedAudios
            });
            setResult(manifestResult);
            setGeneralWarnings(manifestResult.warnings);
            setFileErrors(manifestResult.fileErrors);
        } catch (err: any) {
            setProcessError(`Unexpected error during processing: ${err?.message || String(err)}`);
        } finally {
            setProcessing(false);
        }
    }, [csvRows, selectedFiles, folderLabel, expectedImages, expectedAudios]);

    const manifest: DatasetManifest | null = result ? result.manifest : null;

    return (
        <div className="app-root">
            <div className="app-container">
                <header className="app-header">
                    <h1>Marmoset Dataset Preparation</h1>
                    <p>
                        Strict, opinionated checker and manifest builder for <span className="chip">JPG</span>
                        <span className="chip">WAV</span> + <span className="chip">data_info.csv</span>.
                    </p>
                </header>

                {/* NEW: minimal doc for data_info.csv */}
                <section className="section">
                    <div className="section-title">data_info.csv requirements (minimal)</div>
                    <div className="section-subtitle">
                        The tool assumes a single CSV file named <code>data_info.csv</code> in the selected
                        folder, defining all identities. Extra columns are allowed, but at least the following
                        are strongly recommended:
                    </div>
                    <ul className="small-text">
                        <li>
                            <code>ID</code> – string; animal identity, letters only (e.g. <code>A</code>,{' '}
                            <code>B</code>, <code>Odin</code>).
                        </li>
                        <li>
                            <code>familiarity</code> – string; e.g. <code>familiar</code> / <code>unfamiliar</code>
                            .
                        </li>
                        <li>
                            <code>partner_ID</code> – string; ID of partner or empty.
                        </li>
                        <li>
                            <code>sex</code> – string; e.g. <code>m</code> or <code>f</code>.
                        </li>
                        <li>
                            <code>focal</code> – integer; <code>1</code> for focal/subject animals,{' '}
                            <code>0</code> otherwise.
                        </li>
                    </ul>
                    <div className="small-text" style={{ marginTop: '0.35rem' }}>
                        A minimal example:
                    </div>
                    <pre
                        style={{
                            whiteSpace: 'pre',
                            fontSize: '0.78rem',
                            marginTop: '0.35rem',
                            padding: '0.5rem',
                            borderRadius: '0.5rem',
                            border: '1px solid #1f2937',
                            background: '#020617'
                        }}
                    >
            {`ID,familiarity,partner_ID,sex,focal
A,familiar,B,f,1
B,familiar,A,f,1
C,familiar,D,m,1
D,familiar,C,m,1
Lola,unfamiliar,,f,0
Odin,unfamiliar,,m,0`}
          </pre>
                </section>

                <section className="section">
                    <div className="section-title">1. Select example data folder</div>
                    <div className="section-subtitle">
                        The folder must contain <code>data_info.csv</code> plus media files named like{' '}
                        <code>A1.jpg</code>, <code>Odin3.wav</code>, etc.
                    </div>
                    <FolderSelector onFolderChange={handleFolderChange} folderLabel={folderLabel} />
                    <div className="small-text" style={{ marginTop: '0.5rem' }}>
                        Total files: {folderSummary.totalFiles} · data_info.csv: {folderSummary.csvCount} · JPG:{' '}
                        {folderSummary.jpgCount} · WAV: {folderSummary.wavCount}
                    </div>
                </section>

                <section className="section">
                    <div className="section-title">2. data_info.csv status</div>
                    <DataInfoWarning csvOk={csvOk} csvError={csvError} />
                </section>

                <section className="section">
                    <div className="section-title">3. Expected exemplar counts</div>
                    <SettingsPanel
                        expectedImages={expectedImages}
                        expectedAudios={expectedAudios}
                        setExpectedImages={setExpectedImages}
                        setExpectedAudios={setExpectedAudios}
                    />
                </section>

                <section className="section">
                    <div className="section-title">4. Process dataset</div>
                    <ProcessPanel
                        onProcess={handleProcess}
                        processing={processing}
                        canProcess={!!csvRows && selectedFiles.length > 0}
                        processError={processError}
                    />
                    <ErrorList warnings={generalWarnings} fileErrors={fileErrors} />
                </section>

                <section className="section">
                    <div className="section-title">5. Summary table (per identity)</div>
                    <div className="section-subtitle">
                        Shows counts per ID based on <code>data_info.csv</code> and media naming conventions.
                    </div>
                    <SummaryTable manifest={manifest} />
                </section>

                <section className="section">
                    <div className="section-title">6. Export manifest</div>
                    <div className="section-subtitle">
                        Download the processed dataset as JSON or CSV (one row per identity).
                    </div>
                    <ExportPanel manifest={manifest} />
                </section>
            </div>
        </div>
    );
};

export default App;
