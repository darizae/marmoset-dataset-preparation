import React, { useCallback, useMemo, useState } from 'react';
import { DatasetManifest } from '../../domain/types';
import { parsePreparedManifestFromFile } from '../../domain/manifestIO';
import { TrialConfig, TrialSet } from '../../domain/trialTypes';
import { generateTrials } from '../../domain/trialGenerator';
import TrialExportPanel from './TrialExportPanel';

function inferPreparedLabel(file: File | null): string {
    if (!file) return 'No file selected';
    return file.name;
}

function toStringValue(v: any): string {
    if (v === null || v === undefined) return '';
    return String(v);
}

const TrialGenerationTab: React.FC = () => {
    const [preparedFile, setPreparedFile] = useState<File | null>(null);
    const [preparedLabel, setPreparedLabel] = useState<string>('No file selected');
    const [manifest, setManifest] = useState<DatasetManifest | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [subjectId, setSubjectId] = useState<string>('');
    const [partnerId, setPartnerId] = useState<string>('');

    const [totalTrials, setTotalTrials] = useState<number>(40);
    const [familiarFraction, setFamiliarFraction] = useState<number>(0.5);
    const [partnerFractionWithinFamiliar, setPartnerFractionWithinFamiliar] = useState<number>(0.5);
    const [balanceSides, setBalanceSides] = useState<boolean>(true);
    const [avoidRepeatPairings, setAvoidRepeatPairings] = useState<boolean>(true);
    const [seed, setSeed] = useState<string>('42');

    const [trialSet, setTrialSet] = useState<TrialSet | null>(null);
    const [genError, setGenError] = useState<string | null>(null);

    const handlePreparedFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        setManifest(null);
        setLoadError(null);
        setTrialSet(null);
        setGenError(null);
        setSubjectId('');
        setPartnerId('');
        const files = e.target.files;
        if (!files || files.length === 0) {
            setPreparedFile(null);
            setPreparedLabel('No file selected');
            return;
        }
        const file = files[0];
        setPreparedFile(file);
        setPreparedLabel(inferPreparedLabel(file));
        try {
            const m = await parsePreparedManifestFromFile(file);
            setManifest(m);
            const focalIds = m.identities.filter((e) => String(e.properties?.focal) === '1' || String(e.properties?.focal) === 'true').map((e) => e.id);
            const defaultSubject = focalIds.length ? focalIds[0] : (m.identities[0]?.id || '');
            setSubjectId(defaultSubject);
            const subj = m.identities.find((e) => e.id === defaultSubject);
            const partner = subj ? String(subj.properties?.partner_ID || '') : '';
            setPartnerId(partner);
        } catch (err: any) {
            setLoadError(err?.message || String(err));
        }
    }, []);

    const subjects = useMemo(() => {
        if (!manifest) return [];
        return manifest.identities.map((e) => e.id);
    }, [manifest]);

    const subjectPartnerId = useMemo(() => {
        if (!manifest || !subjectId) return '';
        const subj = manifest.identities.find((e) => e.id === subjectId);
        if (!subj) return '';
        return String(subj.properties?.partner_ID || '');
    }, [manifest, subjectId]);

    const poolsSummary = useMemo(() => {
        if (!manifest || !subjectId) return null;
        const subj = manifest.identities.find((e) => e.id === subjectId);
        if (!subj) return null;
        const partner = String(subj.properties?.partner_ID || '');
        const partnerEntry = manifest.identities.find((e) => e.id === partner);
        const partnerSex = partnerEntry ? String(partnerEntry.properties?.sex || '').toLowerCase() : '';
        const familiar = manifest.identities.filter((e) => e.id !== subjectId && String(e.properties?.sex || '').toLowerCase() === partnerSex && String(e.properties?.familiarity || '').toLowerCase() === 'familiar');
        const unfamiliar = manifest.identities.filter((e) => e.id !== subjectId && String(e.properties?.sex || '').toLowerCase() === partnerSex && String(e.properties?.familiarity || '').toLowerCase() === 'unfamiliar');
        const famWithMedia = familiar.filter((e) => e.imageExemplars.length > 0 && e.audioExemplars.length > 0);
        const unfamWithMedia = unfamiliar.filter((e) => e.imageExemplars.length > 0 && e.audioExemplars.length > 0);
        return {
            partner,
            familiarCount: familiar.length,
            unfamiliarCount: unfamiliar.length,
            familiarWithMedia: famWithMedia.length,
            unfamiliarWithMedia: unfamWithMedia.length
        };
    }, [manifest, subjectId]);

    const canGenerate = useMemo(() => {
        return !!manifest && !!subjectId;
    }, [manifest, subjectId]);

    const handleGenerate = useCallback(() => {
        setGenError(null);
        setTrialSet(null);
        if (!manifest || !subjectId) return;
        try {
            const cfg: TrialConfig = {
                totalTrials,
                familiarFraction,
                partnerFractionWithinFamiliar,
                balanceSides,
                avoidRepeatPairings,
                seed
            };
            const ts = generateTrials(manifest, subjectId, cfg);
            setTrialSet(ts);
        } catch (err: any) {
            setGenError(err?.message || String(err));
        }
    }, [manifest, subjectId, totalTrials, familiarFraction, partnerFractionWithinFamiliar, balanceSides, avoidRepeatPairings, seed]);

    return (
        <div>
            <section className="section">
                <div className="section-title">Load prepared manifest (JSON or CSV)</div>
                <div className="inline-input-row">
                    <input type="file" accept=".json,.csv" onChange={handlePreparedFileChange} />
                    <span className="small-text">Selected: {preparedLabel}</span>
                </div>
                {loadError && <div className="error-item" style={{ marginTop: '0.5rem' }}>{loadError}</div>}
                {manifest && (
                    <div className="small-text" style={{ marginTop: '0.5rem' }}>
                        Loaded identities: {manifest.identities.length} · Data dir: {manifest.meta?.dataDirLabel || '—'}
                    </div>
                )}
            </section>

            <section className="section">
                <div className="section-title">Subject and partner</div>
                <div className="inline-input-row">
                    <label className="label">
                        Subject
                        <select
                            className="input-number"
                            value={subjectId}
                            onChange={(e) => {
                                setSubjectId(e.target.value);
                                setTrialSet(null);
                                setGenError(null);
                                if (manifest) {
                                    const subj = manifest.identities.find((x) => x.id === e.target.value);
                                    setPartnerId(subj ? toStringValue(subj.properties?.partner_ID) : '');
                                }
                            }}
                        >
                            {subjects.map((id) => (
                                <option key={id} value={id}>
                                    {id}
                                </option>
                            ))}
                        </select>
                    </label>
                    <span className="small-text">Partner: {subjectPartnerId || partnerId || '—'}</span>
                </div>
                {poolsSummary && (
                    <div className="small-text" style={{ marginTop: '0.5rem' }}>
                        Familiar (same sex): {poolsSummary.familiarCount} · Unfamiliar (same sex): {poolsSummary.unfamiliarCount} · Familiar with media: {poolsSummary.familiarWithMedia} · Unfamiliar with media: {poolsSummary.unfamiliarWithMedia}
                    </div>
                )}
            </section>

            <section className="section">
                <div className="section-title">Trial generation settings</div>
                <div className="inline-input-row">
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
                        Seed
                        <input
                            className="input-number"
                            type="text"
                            value={seed}
                            onChange={(e) => setSeed(e.target.value)}
                        />
                    </label>
                </div>
                <div className="inline-input-row" style={{ marginTop: '0.5rem' }}>
                    <label className="label">
                        <input
                            type="checkbox"
                            checked={balanceSides}
                            onChange={(e) => setBalanceSides(e.target.checked)}
                        />{' '}
                        Balance partner side
                    </label>
                    <label className="label">
                        <input
                            type="checkbox"
                            checked={avoidRepeatPairings}
                            onChange={(e) => setAvoidRepeatPairings(e.target.checked)}
                        />{' '}
                        Avoid repeat audio-image pairings
                    </label>
                </div>
            </section>

            <section className="section">
                <div className="section-title">Generate trials</div>
                <div className="inline-input-row">
                    <button className="button button-primary" disabled={!canGenerate} onClick={handleGenerate}>
                        {canGenerate ? 'Generate trials' : 'Load prepared manifest first'}
                    </button>
                    {genError && <div className="error-item">{genError}</div>}
                </div>
                {trialSet && (
                    <>
                        <div className="small-text" style={{ marginTop: '0.5rem' }}>
                            Generated {trialSet.trials.length} trials for subject {trialSet.meta.subjectId} (partner {trialSet.meta.partnerId}). Seed: {trialSet.meta.seed}
                        </div>
                        {trialSet.meta.warnings.length > 0 && (
                            <ul className="warning-list" style={{ marginTop: '0.5rem' }}>
                                {trialSet.meta.warnings.map((w, i) => (
                                    <li key={i} className="warning-item">
                                        {w.message}
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div className="table-wrapper" style={{ marginTop: '0.75rem' }}>
                            <table>
                                <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Call ID</th>
                                    <th>Call cat</th>
                                    <th>Partner side</th>
                                    <th>Correct</th>
                                    <th>Other</th>
                                    <th>Audio</th>
                                    <th>Left image</th>
                                    <th>Right image</th>
                                </tr>
                                </thead>
                                <tbody>
                                {trialSet.trials.slice(0, 10).map((t) => (
                                    <tr key={t.trialId}>
                                        <td>{t.trialNumber}</td>
                                        <td>{t.callIdentityId}</td>
                                        <td>{t.callCategory}</td>
                                        <td>{t.partnerSide}</td>
                                        <td>{t.correctSide}</td>
                                        <td>{t.otherIdentityId}</td>
                                        <td>
                                            {t.audio.identityId} #{t.audio.exemplarIndex}
                                        </td>
                                        <td>
                                            {t.leftImage.identityId} #{t.leftImage.exemplarIndex}
                                        </td>
                                        <td>
                                            {t.rightImage.identityId} #{t.rightImage.exemplarIndex}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="small-text" style={{ marginTop: '0.4rem' }}>
                            Preview shows the first 10 trials.
                        </div>
                        <div style={{ marginTop: '0.75rem' }}>
                            <TrialExportPanel trialSet={trialSet} />
                        </div>
                    </>
                )}
            </section>
        </div>
    );
};

export default TrialGenerationTab;

