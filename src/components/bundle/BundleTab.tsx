import React, { useCallback, useMemo, useState } from 'react';
import FolderSelector from '../common/FolderSelector';
import ErrorList from '../common/ErrorList';
import { parseDataInfoCsv } from '../../domain/csvParser';
import { buildDatasetManifest } from '../../domain/datasetBuilder';
import { CsvIdentityRow, DatasetManifest, DatasetWarning, FileError, IdentityDatasetEntry } from '../../domain/types';
import { TrialConfig, TrialSet } from '../../domain/trialTypes';
import BundleStepHeader from './BundleStepHeader';
import BundleExplorer from './BundleExplorer';
import { parseBundleFromDirectorySelection } from '../../domain/bundle/bundleParser';
import {
    buildBundleInMemory,
    buildSeedPolicyGlobal,
    chooseDefaultDatasetId,
    deriveSubjectSeed,
    downloadBundleZip,
    generateMultiSubjectTrials,
    listDefaultSubjectIds
} from '../../domain/bundle/bundleBuilder';

type BuildStep = 1 | 2 | 3 | 4 | 5;

function inferFolderLabel(files: File[]): string {
    if (!files.length) return 'No folder selected';
    const anyFile = files[0] as any;
    const rel = typeof anyFile.webkitRelativePath === 'string' ? anyFile.webkitRelativePath : files[0].name;
    if (!rel || !rel.includes('/')) return rel || 'Selected folder';
    return rel.split('/')[0];
}

function isFocal(entry: IdentityDatasetEntry): boolean {
    const v = entry.properties?.focal;
    const s = String(v ?? '').trim().toLowerCase();
    return s === '1' || s === 'true';
}

function toLower(v: unknown): string {
    return String(v ?? '').trim().toLowerCase();
}

function computePoolSummary(manifest: DatasetManifest, subjectId: string): { partnerId: string; familiarWithMedia: number; unfamiliarWithMedia: number; errors: string[] } {
    const errors: string[] = [];
    const subject = manifest.identities.find((e) => e.id === subjectId);
    if (!subject) return { partnerId: '', familiarWithMedia: 0, unfamiliarWithMedia: 0, errors: [`Subject not found: ${subjectId}`] };

    const partnerId = String(subject.properties?.partner_ID ?? subject.properties?.partnerId ?? subject.properties?.partner ?? '').trim();
    if (!partnerId) errors.push(`Subject "${subjectId}" is missing partner_ID.`);
    const partner = manifest.identities.find((e) => e.id === partnerId);
    if (!partner) errors.push(`Partner "${partnerId}" not found for subject "${subjectId}".`);

    const partnerSex = partner ? toLower(partner.properties?.sex) : '';
    if (!partnerSex) errors.push(`Partner "${partnerId}" has no sex property.`);

    const familiar = manifest.identities.filter((e) => e.id !== subjectId && toLower(e.properties?.sex) === partnerSex && toLower(e.properties?.familiarity) === 'familiar');
    const unfamiliar = manifest.identities.filter((e) => e.id !== subjectId && toLower(e.properties?.sex) === partnerSex && toLower(e.properties?.familiarity) === 'unfamiliar');

    const familiarWithMedia = familiar.filter((e) => e.imageExemplars.length > 0 && e.audioExemplars.length > 0).length;
    const unfamiliarWithMedia = unfamiliar.filter((e) => e.imageExemplars.length > 0 && e.audioExemplars.length > 0).length;

    return { partnerId, familiarWithMedia, unfamiliarWithMedia, errors };
}

const BundleTab: React.FC = () => {
    const [mode, setMode] = useState<'build' | 'visualize'>('build');

    const [step, setStep] = useState<BuildStep>(1);

    const [datasetFiles, setDatasetFiles] = useState<File[]>([]);
    const [datasetFolderLabel, setDatasetFolderLabel] = useState<string>('No folder selected');

    const [csvError, setCsvError] = useState<string | null>(null);
    const [csvRows, setCsvRows] = useState<CsvIdentityRow[] | null>(null);

    const [manifest, setManifest] = useState<DatasetManifest | null>(null);
    const [datasetWarnings, setDatasetWarnings] = useState<DatasetWarning[]>([]);
    const [datasetFileErrors, setDatasetFileErrors] = useState<FileError[]>([]);

    const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
    const [datasetId, setDatasetId] = useState<string>('');

    const [totalTrials, setTotalTrials] = useState<number>(40);
    const [familiarFraction, setFamiliarFraction] = useState<number>(0.5);
    const [partnerFractionWithinFamiliar, setPartnerFractionWithinFamiliar] = useState<number>(0.5);
    const [balanceSides, setBalanceSides] = useState<boolean>(true);
    const [avoidRepeatPairings, setAvoidRepeatPairings] = useState<boolean>(true);

    const [globalSeed, setGlobalSeed] = useState<string>('42');
    const [perSubjectOverrides, setPerSubjectOverrides] = useState<Record<string, string>>({});

    const [trialSets, setTrialSets] = useState<Record<string, TrialSet>>({});
    const [generationErrors, setGenerationErrors] = useState<string[]>([]);
    const [generationWarnings, setGenerationWarnings] = useState<string[]>([]);

    const [bundleFiles, setBundleFiles] = useState<File[]>([]);
    const [bundleFolderLabel, setBundleFolderLabel] = useState<string>('No folder selected');
    const [bundleStrictErrors, setBundleStrictErrors] = useState<string[]>([]);
    const [bundleWarnings, setBundleWarnings] = useState<string[]>([]);
    const [bundleTrialSets, setBundleTrialSets] = useState<Record<string, TrialSet>>({});
    const [bundleMediaByInternalPath, setBundleMediaByInternalPath] = useState<Map<string, File>>(new Map());

    const resetBuildState = () => {
        setDatasetFiles([]);
        setDatasetFolderLabel('No folder selected');
        setCsvError(null);
        setCsvRows(null);
        setManifest(null);
        setDatasetWarnings([]);
        setDatasetFileErrors([]);
        setSelectedSubjectIds([]);
        setDatasetId('');
        setTrialSets({});
        setGenerationErrors([]);
        setGenerationWarnings([]);
        setStep(1);
    };

    const resetVisualizeState = () => {
        setBundleFiles([]);
        setBundleFolderLabel('No folder selected');
        setBundleStrictErrors([]);
        setBundleWarnings([]);
        setBundleTrialSets({});
        setBundleMediaByInternalPath(new Map());
    };

    const onSwitchMode = (nextMode: 'build' | 'visualize') => {
        setMode(nextMode);
        resetBuildState();
        resetVisualizeState();
    };

    const canGoToStep = useCallback((target: BuildStep) => {
        if (mode !== 'build') return false;
        if (target === 1) return true;
        if (target === 2) return !!manifest && datasetFileErrors.length === 0 && !csvError;
        if (target === 3) return selectedSubjectIds.length > 0 && !!manifest;
        if (target === 4) return Object.keys(trialSets).length > 0 && generationErrors.length === 0;
        if (target === 5) return Object.keys(trialSets).length > 0 && generationErrors.length === 0;
        return false;
    }, [mode, manifest, datasetFileErrors.length, csvError, selectedSubjectIds.length, trialSets, generationErrors.length]);

    const resolveBuildMediaFile = useCallback((internalPath: string) => {
        const fileName = internalPath.split('/').slice(-1)[0];
        const matches = datasetFiles.filter((f) => f.name === fileName);
        if (matches.length === 1) return matches[0];
        return null;
    }, [datasetFiles]);

    const resolveBundleMediaFile = useCallback((internalPath: string) => {
        return bundleMediaByInternalPath.get(internalPath) || null;
    }, [bundleMediaByInternalPath]);

    const onDatasetFolderChange = useCallback(async (filesList: FileList | null) => {
        resetBuildState();
        if (!filesList || filesList.length === 0) return;

        const files = Array.from(filesList);
        const label = inferFolderLabel(files);
        setDatasetFiles(files);
        setDatasetFolderLabel(label);
        setDatasetId(chooseDefaultDatasetId(label));

        const dataInfoFile = files.find((f) => {
            const anyFile = f as any;
            const rel = typeof anyFile.webkitRelativePath === 'string' ? (anyFile.webkitRelativePath as string) : f.name;
            const isRoot = rel.split('/').length === 2;
            return isRoot && f.name === 'data_info.csv';
        });

        if (!dataInfoFile) {
            setCsvError('Required file "data_info.csv" must exist directly inside the selected dataset root folder.');
            return;
        }

        try {
            const parsed = await parseDataInfoCsv(dataInfoFile);
            setCsvRows(parsed.rows);

            const result = buildDatasetManifest({
                csvRows: parsed.rows,
                dataDirLabel: label,
                files,
                expectedImages: 1,
                expectedAudios: 1
            });

            setManifest(result.manifest);
            setDatasetWarnings(result.warnings);
            setDatasetFileErrors(result.fileErrors);

            const defaults = listDefaultSubjectIds(result.manifest).filter((id) => {
                const entry = result.manifest.identities.find((e) => e.id === id);
                return entry ? isFocal(entry) : false;
            });
            const fallback = listDefaultSubjectIds(result.manifest);
            const initial = defaults.length ? defaults : fallback;
            setSelectedSubjectIds(initial);

            setStep(2);
        } catch (err: any) {
            setCsvError(err?.message || String(err));
        }
    }, []);

    const subjectOptions = useMemo(() => {
        if (!manifest) return [];
        return manifest.identities.map((e) => e.id).sort();
    }, [manifest]);

    const selectedSubjectSummaries = useMemo(() => {
        if (!manifest) return [];
        return selectedSubjectIds.map((sid) => {
            const summary = computePoolSummary(manifest, sid);
            return { subjectId: sid, ...summary };
        });
    }, [manifest, selectedSubjectIds]);

    const subjectSelectionStrictErrors = useMemo(() => {
        const errors: string[] = [];
        if (!manifest) return errors;
        for (const s of selectedSubjectSummaries) {
            for (const e of s.errors) errors.push(e);
        }
        return errors;
    }, [manifest, selectedSubjectSummaries]);

    const baseConfig = useMemo((): Omit<TrialConfig, 'seed'> => {
        return {
            totalTrials,
            familiarFraction,
            partnerFractionWithinFamiliar,
            balanceSides,
            avoidRepeatPairings
        };
    }, [totalTrials, familiarFraction, partnerFractionWithinFamiliar, balanceSides, avoidRepeatPairings]);

    const seedPolicy = useMemo(() => {
        return buildSeedPolicyGlobal(globalSeed, perSubjectOverrides);
    }, [globalSeed, perSubjectOverrides]);

    const derivedSeeds = useMemo(() => {
        const out: Record<string, string> = {};
        for (const sid of selectedSubjectIds) {
            try {
                out[sid] = deriveSubjectSeed(seedPolicy, sid);
            } catch (err: any) {
                out[sid] = `ERROR: ${err?.message || String(err)}`;
            }
        }
        return out;
    }, [selectedSubjectIds, seedPolicy]);

    const onToggleSubject = (subjectId: string) => {
        setTrialSets({});
        setGenerationErrors([]);
        setGenerationWarnings([]);

        setSelectedSubjectIds((prev) => {
            const has = prev.includes(subjectId);
            const next = has ? prev.filter((x) => x !== subjectId) : [...prev, subjectId];
            next.sort((a, b) => a.localeCompare(b));
            return next;
        });
    };

    const onGenerateTrials = () => {
        setGenerationErrors([]);
        setGenerationWarnings([]);
        setTrialSets({});

        if (!manifest) return;
        if (!selectedSubjectIds.length) {
            setGenerationErrors(['Select at least one subject.']);
            return;
        }
        if (datasetFileErrors.length > 0 || csvError) {
            setGenerationErrors(['Fix dataset file errors before generating trials.']);
            return;
        }
        if (subjectSelectionStrictErrors.length > 0) {
            setGenerationErrors(subjectSelectionStrictErrors);
            return;
        }

        try {
            const generated = generateMultiSubjectTrials(manifest, selectedSubjectIds, baseConfig, seedPolicy);
            setTrialSets(generated);

            const nonFatal: string[] = [];
            for (const sid of Object.keys(generated)) {
                const warns = generated[sid].meta.warnings || [];
                for (const w of warns) nonFatal.push(`${sid}: ${w.message}`);
            }
            setGenerationWarnings(nonFatal);

            setStep(4);
        } catch (err: any) {
            setGenerationErrors([err?.message || String(err)]);
        }
    };

    const onDownloadZip = async () => {
        if (!manifest) return;
        if (!Object.keys(trialSets).length) return;

        setGenerationErrors([]);
        try {
            const bundle = buildBundleInMemory(
                datasetId,
                datasetFolderLabel,
                manifest,
                trialSets,
                seedPolicy,
                baseConfig,
                datasetFiles
            );
            await downloadBundleZip(bundle, datasetId);
        } catch (err: any) {
            setGenerationErrors([err?.message || String(err)]);
        }
    };

    const onBundleFolderChange = useCallback(async (filesList: FileList | null) => {
        resetVisualizeState();
        if (!filesList || filesList.length === 0) return;

        const files = Array.from(filesList);
        setBundleFiles(files);
        setBundleFolderLabel(inferFolderLabel(files));

        try {
            const parsed = await parseBundleFromDirectorySelection(files);
            setBundleTrialSets(parsed.trialSets);
            setBundleMediaByInternalPath(parsed.mediaByInternalPath);
            setBundleStrictErrors([]);
            setBundleWarnings([]);
        } catch (err: any) {
            setBundleStrictErrors([err?.message || String(err)]);
        }
    }, []);

    return (
        <div>
            <section className="section" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                <div className="section-title">Deployable multi-subject Bundle builder + visual explorer</div>
                <div className="section-subtitle">
                    Build mode: select a dataset folder, generate trials for one or many subjects, inspect trials + media, then download one bundle zip.
                    Visualize mode: load an existing bundle directory and explore/verify it without regeneration.
                </div>

                <div className="inline-input-row">
                    <button className="button" disabled={mode === 'build'} onClick={() => onSwitchMode('build')}>
                        Build a bundle
                    </button>
                    <button className="button" disabled={mode === 'visualize'} onClick={() => onSwitchMode('visualize')}>
                        Visualize an existing bundle
                    </button>
                </div>
            </section>

            <section className="section">
                <BundleStepHeader
                    mode={mode}
                    step={step}
                    setStep={setStep}
                    canGoToStep={canGoToStep}
                />

                {mode === 'visualize' && (
                    <>
                        <div className="panel" style={{ marginBottom: '0.75rem' }}>
                            <div className="panel-title">Select bundle root directory</div>
                            <div className="panel-subtitle">
                                Must contain: <code>dataset_meta.json</code>, <code>manifest.json</code>, <code>trial_sets/&lt;subject&gt;/trials.json</code>, and <code>media/images</code> + <code>media/audio</code>.
                            </div>
                            <FolderSelector onFolderChange={onBundleFolderChange} folderLabel={bundleFolderLabel} />
                            {bundleStrictErrors.length > 0 && (
                                <div style={{ marginTop: '0.75rem' }}>
                                    <div className="label">Strict errors:</div>
                                    <ul className="error-list">
                                        {bundleStrictErrors.map((e, idx) => (
                                            <li key={idx} className="error-item">{e}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {Object.keys(bundleTrialSets).length > 0 && (
                            <BundleExplorer
                                trialSets={bundleTrialSets}
                                resolveMediaFile={resolveBundleMediaFile}
                                strictErrors={bundleStrictErrors}
                                warnings={bundleWarnings}
                            />
                        )}
                    </>
                )}

                {mode === 'build' && (
                    <>
                        {step === 1 && (
                            <div className="panel">
                                <div className="panel-title">Step 1 — Select dataset folder</div>
                                <div className="panel-subtitle">
                                    The dataset folder is the source of truth: it must contain <code>data_info.csv</code> at the root and all JPG/WAV media.
                                </div>
                                <FolderSelector onFolderChange={onDatasetFolderChange} folderLabel={datasetFolderLabel} />
                                {csvError && <div className="error-item" style={{ marginTop: '0.5rem' }}>{csvError}</div>}
                                <div className="small-text" style={{ marginTop: '0.5rem' }}>
                                    This tab builds the manifest in-memory and blocks bundle creation on strict file errors.
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="panel">
                                <div className="panel-title">Step 2 — Choose subjects</div>
                                <div className="panel-subtitle">
                                    Select one or many focal subjects. Partner is auto-detected from <code>partner_ID</code>.
                                </div>

                                {csvError && <div className="error-item">{csvError}</div>}

                                <div className="inline-input-row" style={{ marginBottom: '0.75rem' }}>
                                    <label className="label">
                                        Dataset ID
                                        <input
                                            className="input-number"
                                            type="text"
                                            value={datasetId}
                                            onChange={(e) => setDatasetId(e.target.value)}
                                            style={{ width: '18rem' }}
                                        />
                                    </label>
                                    <span className="small-text">Used in dataset_meta.json and as the downloaded zip name.</span>
                                </div>

                                <div style={{ marginBottom: '0.75rem' }}>
                                    <ErrorList warnings={datasetWarnings} fileErrors={datasetFileErrors} />
                                </div>

                                {!manifest ? (
                                    <div className="small-text">Select a dataset folder first.</div>
                                ) : (
                                    <>
                                        <div className="small-text" style={{ marginBottom: '0.5rem' }}>
                                            Identities: {manifest.identities.length} · Suggested subjects (focal=1): {manifest.identities.filter(isFocal).length}
                                        </div>

                                        <div className="table-wrapper">
                                            <table>
                                                <thead>
                                                <tr>
                                                    <th>Use</th>
                                                    <th>Subject</th>
                                                    <th>Partner</th>
                                                    <th>Familiar with media</th>
                                                    <th>Unfamiliar with media</th>
                                                    <th>Status</th>
                                                </tr>
                                                </thead>
                                                <tbody>
                                                {subjectOptions.map((sid) => {
                                                    const s = computePoolSummary(manifest, sid);
                                                    const selected = selectedSubjectIds.includes(sid);
                                                    const focal = isFocal(manifest.identities.find((e) => e.id === sid)!);
                                                    const hasErrors = s.errors.length > 0;
                                                    return (
                                                        <tr key={sid}>
                                                            <td>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selected}
                                                                    onChange={() => onToggleSubject(sid)}
                                                                />
                                                            </td>
                                                            <td>{sid}{focal ? ' (focal)' : ''}</td>
                                                            <td>{s.partnerId || '—'}</td>
                                                            <td>{s.familiarWithMedia}</td>
                                                            <td>{s.unfamiliarWithMedia}</td>
                                                            <td className={hasErrors ? '' : 'muted'}>
                                                                {hasErrors ? s.errors.join(' ') : 'OK'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="inline-input-row" style={{ marginTop: '0.75rem' }}>
                                            <button
                                                className="button button-primary"
                                                onClick={() => setStep(3)}
                                                disabled={selectedSubjectIds.length === 0 || datasetFileErrors.length > 0 || !!csvError}
                                            >
                                                Continue to tuning
                                            </button>
                                            {datasetFileErrors.length > 0 && (
                                                <span className="small-text">Fix strict file errors before continuing.</span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {step === 3 && (
                            <div className="panel">
                                <div className="panel-title">Step 3 — Trial generation tuning (multi-subject)</div>
                                <div className="panel-subtitle">
                                    One global seed deterministically derives per-subject seeds. You can override any subject seed if needed.
                                </div>

                                <div className="inline-input-row" style={{ marginBottom: '0.75rem' }}>
                                    <label className="label">
                                        Total trials
                                        <input
                                            className="input-number"
                                            type="number"
                                            min={1}
                                            value={totalTrials}
                                            onChange={(e) => setTotalTrials(Math.max(1, Number(e.target.value)))}
                                        />
                                    </label>

                                    <label className="label">
                                        Familiar fraction
                                        <input
                                            className="input-number"
                                            type="number"
                                            min={0}
                                            max={1}
                                            step={0.05}
                                            value={familiarFraction}
                                            onChange={(e) => {
                                                const v = Number(e.target.value);
                                                if (v >= 0 && v <= 1) setFamiliarFraction(v);
                                            }}
                                        />
                                    </label>

                                    <label className="label">
                                        Partner fraction within familiar
                                        <input
                                            className="input-number"
                                            type="number"
                                            min={0}
                                            max={1}
                                            step={0.05}
                                            value={partnerFractionWithinFamiliar}
                                            onChange={(e) => {
                                                const v = Number(e.target.value);
                                                if (v >= 0 && v <= 1) setPartnerFractionWithinFamiliar(v);
                                            }}
                                        />
                                    </label>

                                    <label className="label">
                                        Global seed
                                        <input
                                            className="input-number"
                                            type="text"
                                            value={globalSeed}
                                            onChange={(e) => setGlobalSeed(e.target.value)}
                                            style={{ width: '10rem' }}
                                        />
                                    </label>
                                </div>

                                <div className="inline-input-row" style={{ marginBottom: '0.75rem' }}>
                                    <label className="label">
                                        <input type="checkbox" checked={balanceSides} onChange={(e) => setBalanceSides(e.target.checked)} />{' '}
                                        Balance partner side
                                    </label>
                                    <label className="label">
                                        <input type="checkbox" checked={avoidRepeatPairings} onChange={(e) => setAvoidRepeatPairings(e.target.checked)} />{' '}
                                        Avoid repeat audio–image pairings
                                    </label>
                                </div>

                                <div className="panel" style={{ padding: '0.75rem', marginBottom: '0.75rem' }}>
                                    <div className="panel-title">Per-subject seeds</div>
                                    <div className="small-text" style={{ marginBottom: '0.5rem' }}>
                                        Derived seed is <code>{'{globalSeed}::{subjectId}'}</code> unless an override is set.
                                    </div>

                                    <div className="table-wrapper">
                                        <table>
                                            <thead>
                                            <tr>
                                                <th>Subject</th>
                                                <th>Derived seed</th>
                                                <th>Override (optional)</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {selectedSubjectIds.map((sid) => (
                                                <tr key={sid}>
                                                    <td>{sid}</td>
                                                    <td><code>{derivedSeeds[sid]}</code></td>
                                                    <td>
                                                        <input
                                                            className="input-number"
                                                            type="text"
                                                            value={perSubjectOverrides[sid] || ''}
                                                            onChange={(e) => {
                                                                const v = e.target.value;
                                                                setPerSubjectOverrides((prev) => ({ ...prev, [sid]: v }));
                                                            }}
                                                            style={{ width: '18rem' }}
                                                            placeholder="Leave empty to use derived seed"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="inline-input-row">
                                    <button className="button" onClick={() => setStep(2)}>
                                        Back
                                    </button>
                                    <button className="button button-primary" onClick={onGenerateTrials}>
                                        Generate trials + validate media
                                    </button>
                                    <span className="small-text">
                                        This step is strict: any generation failure or missing media blocks bundle creation.
                                    </span>
                                </div>

                                {generationErrors.length > 0 && (
                                    <div style={{ marginTop: '0.75rem' }}>
                                        <div className="label">Strict errors:</div>
                                        <ul className="error-list">
                                            {generationErrors.map((e, idx) => (
                                                <li key={idx} className="error-item">{e}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 4 && (
                            <>
                                <div className="panel" style={{ marginBottom: '0.75rem' }}>
                                    <div className="panel-title">Step 4 — Visual explorer + validation</div>
                                    <div className="panel-subtitle">
                                        Explore generated trials per subject, preview images and WAV audio, and review warnings/errors.
                                    </div>

                                    <div className="inline-input-row">
                                        <button className="button" onClick={() => setStep(3)}>
                                            Back to tuning
                                        </button>
                                        <button className="button button-primary" onClick={() => setStep(5)} disabled={generationErrors.length > 0}>
                                            Continue to download
                                        </button>
                                    </div>

                                    {generationErrors.length > 0 && (
                                        <div className="error-item" style={{ marginTop: '0.5rem' }}>
                                            Fix strict errors before continuing.
                                        </div>
                                    )}
                                </div>

                                <BundleExplorer
                                    trialSets={trialSets}
                                    resolveMediaFile={resolveBuildMediaFile}
                                    strictErrors={generationErrors}
                                    warnings={generationWarnings}
                                />
                            </>
                        )}

                        {step === 5 && (
                            <div className="panel">
                                <div className="panel-title">Step 5 — Download bundle zip</div>
                                <div className="panel-subtitle">
                                    The zip contains: <code>dataset_meta.json</code>, <code>manifest.json</code>, <code>trial_sets/&lt;subject&gt;/trials.json</code> (+ CSV), and <code>media/images</code> + <code>media/audio</code>.
                                </div>

                                <div className="inline-input-row">
                                    <button className="button" onClick={() => setStep(4)}>
                                        Back to explorer
                                    </button>
                                    <button className="button button-primary" onClick={onDownloadZip} disabled={!manifest || generationErrors.length > 0 || !Object.keys(trialSets).length}>
                                        Download bundle zip
                                    </button>
                                    <span className="small-text">
                                        This is strict: missing media, duplicates, or path issues fail the build.
                                    </span>
                                </div>

                                {generationErrors.length > 0 && (
                                    <div style={{ marginTop: '0.75rem' }}>
                                        <div className="label">Strict errors:</div>
                                        <ul className="error-list">
                                            {generationErrors.map((e, idx) => (
                                                <li key={idx} className="error-item">{e}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {manifest && (
                                    <div className="small-text" style={{ marginTop: '0.75rem' }}>
                                        Subjects in bundle: <strong>{selectedSubjectIds.join(', ')}</strong>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </section>
        </div>
    );
};

export default BundleTab;
