import React, { useCallback, useMemo, useState } from 'react';
import { Trial, TrialSet } from '../../domain/trialTypes';
import TrialGraphView from './TrialGraphView';
import TrialDetailPanel from './TrialDetailPanel';

type ConditionLabel = 'partner' | 'familiar_non_partner' | 'unfamiliar' | 'unknown';

function deriveCondition(isPartnerCall: boolean, callCategory: string): ConditionLabel {
    if (isPartnerCall) return 'partner';
    const c = String(callCategory || '').toLowerCase();
    if (c === 'familiar') return 'familiar_non_partner';
    if (c === 'unfamiliar') return 'unfamiliar';
    return 'unknown';
}

type Side = 'left' | 'right';

interface Props {
    trialSets: Record<string, TrialSet>;
    resolveMediaFile: (internalPath: string) => File | null;
    strictErrors: string[];
    warnings: string[];
}

const BundleExplorer: React.FC<Props> = ({ trialSets, resolveMediaFile, strictErrors, warnings }) => {
    const subjectIds = useMemo(() => Object.keys(trialSets).sort(), [trialSets]);

    const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjectIds[0] || '');
    const [selectedIdentityId, setSelectedIdentityId] = useState<string | null>(null);
    const [selectedTrialId, setSelectedTrialId] = useState<string | null>(null);

    const [conditionFilter, setConditionFilter] = useState<ConditionLabel | 'all'>('all');
    const [callIdentityFilter, setCallIdentityFilter] = useState<string>('all');
    const [partnerSideFilter, setPartnerSideFilter] = useState<Side | 'all'>('all');
    const [correctSideFilter, setCorrectSideFilter] = useState<Side | 'all'>('all');

    const trialSet = selectedSubjectId ? trialSets[selectedSubjectId] : null;

    const callIdentityOptions = useMemo(() => {
        if (!trialSet) return [];
        return Array.from(new Set(trialSet.trials.map((t) => t.callIdentityId))).sort();
    }, [trialSet]);

    const filteredTrials = useMemo(() => {
        if (!trialSet) return [];
        return trialSet.trials.filter((t) => {
            if (selectedIdentityId && t.otherIdentityId !== selectedIdentityId && t.callIdentityId !== selectedIdentityId && t.partnerId !== selectedIdentityId) {
                return false;
            }
            if (conditionFilter !== 'all') {
                const cond = deriveCondition(t.isPartnerCall, t.callCategory);
                if (cond !== conditionFilter) return false;
            }
            if (callIdentityFilter !== 'all' && t.callIdentityId !== callIdentityFilter) return false;
            if (partnerSideFilter !== 'all' && t.partnerSide !== partnerSideFilter) return false;
            if (correctSideFilter !== 'all' && t.correctSide !== correctSideFilter) return false;
            return true;
        });
    }, [trialSet, selectedIdentityId, conditionFilter, callIdentityFilter, partnerSideFilter, correctSideFilter]);

    const selectedTrial = useMemo(() => {
        if (!trialSet || !selectedTrialId) return null;
        return trialSet.trials.find((t) => t.trialId === selectedTrialId) || null;
    }, [trialSet, selectedTrialId]);

    const summary = useMemo(() => {
        if (!trialSet) return null;
        const counts: Record<ConditionLabel, number> = { partner: 0, familiar_non_partner: 0, unfamiliar: 0, unknown: 0 };
        for (const t of trialSet.trials) {
            counts[deriveCondition(t.isPartnerCall, t.callCategory)] += 1;
        }
        return counts;
    }, [trialSet]);

    const onSelectSubject = (sid: string) => {
        setSelectedSubjectId(sid);
        setSelectedIdentityId(null);
        setSelectedTrialId(null);
        setConditionFilter('all');
        setCallIdentityFilter('all');
        setPartnerSideFilter('all');
        setCorrectSideFilter('all');
    };

    const onSelectIdentity = useCallback((identityId: string) => {
        setSelectedIdentityId(identityId);
        setSelectedTrialId(null);
    }, []);

    const onSelectTrial = (t: Trial) => {
        setSelectedTrialId(t.trialId);
    };

    const clearFocus = () => {
        setSelectedIdentityId(null);
        setSelectedTrialId(null);
    };

    if (!trialSet) {
        return <div className="small-text">No trial sets available.</div>;
    }

    return (
        <div>
            <div className="inline-input-row" style={{ marginBottom: '0.75rem' }}>
                <label className="label">
                    Subject
                    <select
                        className="input-number"
                        value={selectedSubjectId}
                        onChange={(e) => onSelectSubject(e.target.value)}
                        style={{ width: '14rem' }}
                    >
                        {subjectIds.map((sid) => (
                            <option key={sid} value={sid}>{sid}</option>
                        ))}
                    </select>
                </label>

                <span className="small-text">
                    Partner: <strong>{trialSet.meta.partnerId}</strong> · Trials: <strong>{trialSet.trials.length}</strong>
                </span>

                {selectedIdentityId && (
                    <span className="small-text">
                        Focus: <strong>{selectedIdentityId}</strong> · Showing <strong>{filteredTrials.length}</strong>
                        <button className="button" style={{ marginLeft: '0.5rem', fontSize: '0.8rem', padding: '0.25rem 0.6rem' }} onClick={clearFocus}>
                            Clear focus
                        </button>
                    </span>
                )}
            </div>

            <div className="split-pane">
                <div>
                    <TrialGraphView trialSet={trialSet} onSelectIdentity={onSelectIdentity} selectedIdentityId={selectedIdentityId} />

                    <div className="panel" style={{ marginTop: '0.75rem' }}>
                        <div className="panel-title">Filters</div>
                        <div className="inline-input-row" style={{ marginBottom: '0.5rem' }}>
                            <label className="label">
                                Condition
                                <select
                                    className="input-number"
                                    value={conditionFilter}
                                    onChange={(e) => setConditionFilter(e.target.value as any)}
                                    style={{ width: '14rem' }}
                                >
                                    <option value="all">All</option>
                                    <option value="partner">partner</option>
                                    <option value="familiar_non_partner">familiar_non_partner</option>
                                    <option value="unfamiliar">unfamiliar</option>
                                    <option value="unknown">unknown</option>
                                </select>
                            </label>

                            <label className="label">
                                Call identity
                                <select
                                    className="input-number"
                                    value={callIdentityFilter}
                                    onChange={(e) => setCallIdentityFilter(e.target.value)}
                                    style={{ width: '14rem' }}
                                >
                                    <option value="all">All</option>
                                    {callIdentityOptions.map((id) => (
                                        <option key={id} value={id}>{id}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="label">
                                Partner side
                                <select
                                    className="input-number"
                                    value={partnerSideFilter}
                                    onChange={(e) => setPartnerSideFilter(e.target.value as any)}
                                    style={{ width: '8rem' }}
                                >
                                    <option value="all">All</option>
                                    <option value="left">left</option>
                                    <option value="right">right</option>
                                </select>
                            </label>

                            <label className="label">
                                Correct side
                                <select
                                    className="input-number"
                                    value={correctSideFilter}
                                    onChange={(e) => setCorrectSideFilter(e.target.value as any)}
                                    style={{ width: '8rem' }}
                                >
                                    <option value="all">All</option>
                                    <option value="left">left</option>
                                    <option value="right">right</option>
                                </select>
                            </label>
                        </div>

                        {summary && (
                            <div className="small-text">
                                <span className="chip">partner: {summary.partner}</span>
                                <span className="chip">familiar_non_partner: {summary.familiar_non_partner}</span>
                                <span className="chip">unfamiliar: {summary.unfamiliar}</span>
                                <span className="chip">unknown: {summary.unknown}</span>
                            </div>
                        )}
                    </div>

                    <div className="panel" style={{ marginTop: '0.75rem' }}>
                        <div className="panel-title">Trials</div>
                        <div className="panel-subtitle">
                            Click a row to preview the trial. The table shows up to 200 rows for snappy UI.
                        </div>

                        <div className="scroll-area">
                            <table>
                                <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Call</th>
                                    <th>Cond</th>
                                    <th>Other</th>
                                    <th>Partner side</th>
                                    <th>Correct</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredTrials.slice(0, 200).map((t) => {
                                    const cond = deriveCondition(t.isPartnerCall, t.callCategory);
                                    const active = selectedTrialId === t.trialId;
                                    return (
                                        <tr
                                            key={t.trialId}
                                            style={{ cursor: 'pointer', background: active ? '#0b1120' : undefined }}
                                            onClick={() => onSelectTrial(t)}
                                            title={t.trialId}
                                        >
                                            <td>{t.trialNumber}</td>
                                            <td>{t.callIdentityId}</td>
                                            <td>{cond}</td>
                                            <td>{t.otherIdentityId}</td>
                                            <td>{t.partnerSide}</td>
                                            <td>{t.correctSide}</td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>

                        <div className="small-text" style={{ marginTop: '0.5rem' }}>
                            Showing {Math.min(200, filteredTrials.length)} / {filteredTrials.length}
                        </div>
                    </div>

                    {(strictErrors.length > 0 || warnings.length > 0) && (
                        <div className="panel" style={{ marginTop: '0.75rem' }}>
                            <div className="panel-title">Validation</div>

                            {strictErrors.length > 0 && (
                                <div style={{ marginBottom: '0.75rem' }}>
                                    <div className="label">Strict errors (must fix):</div>
                                    <ul className="error-list">
                                        {strictErrors.map((e, idx) => (
                                            <li key={idx} className="error-item">{e}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {warnings.length > 0 && (
                                <div>
                                    <div className="label">Warnings (non-fatal):</div>
                                    <ul className="warning-list">
                                        {warnings.map((w, idx) => (
                                            <li key={idx} className="warning-item">{w}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <TrialDetailPanel trial={selectedTrial} resolveMediaFile={resolveMediaFile} />
            </div>
        </div>
    );
};

export default BundleExplorer;
