import React, { useMemo } from 'react';
import { Trial } from '../../domain/trialTypes';
import { useObjectUrl } from '../common/hooks/useObjectUrl';

interface Props {
    trial: Trial | null;
    resolveMediaFile: (internalPath: string) => File | null;
}

const TrialDetailPanel: React.FC<Props> = ({ trial, resolveMediaFile }) => {
    const leftImageFile = useMemo(() => (trial ? resolveMediaFile(trial.leftImage.path) : null), [trial, resolveMediaFile]);
    const rightImageFile = useMemo(() => (trial ? resolveMediaFile(trial.rightImage.path) : null), [trial, resolveMediaFile]);
    const audioFile = useMemo(() => (trial ? resolveMediaFile(trial.audio.path) : null), [trial, resolveMediaFile]);

    const leftUrl = useObjectUrl(leftImageFile);
    const rightUrl = useObjectUrl(rightImageFile);
    const audioUrl = useObjectUrl(audioFile, 'audio/wav');

    if (!trial) {
        return (
            <div className="panel">
                <div className="panel-title">Trial detail</div>
                <div className="small-text">Select a trial in the table or graph to preview images and audio.</div>
            </div>
        );
    }

    return (
        <div className="panel">
            <div className="panel-title">Trial detail</div>
            <div className="small-text" style={{ marginBottom: '0.5rem' }}>
                <span className="chip">#{trial.trialNumber}</span>
                <span className="chip">call: {trial.callIdentityId}</span>
                <span className="chip">{trial.isPartnerCall ? 'partner' : trial.callCategory}</span>
                <span className="chip">partner side: {trial.partnerSide}</span>
                <span className="chip">correct: {trial.correctSide}</span>
            </div>

            <div className="small-text" style={{ marginBottom: '0.4rem' }}>
                Audio: <code>{trial.audio.path}</code>
            </div>
            {audioUrl ? (
                <audio controls preload="none" src={audioUrl} style={{ width: '100%' }} />
            ) : (
                <div className="error-item">Missing audio file for this trial.</div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
                <div>
                    <div className="small-text" style={{ marginBottom: '0.25rem' }}>
                        Left image: <code>{trial.leftImage.path}</code>
                    </div>
                    {leftUrl ? (
                        <img src={leftUrl} alt="Left" style={{ width: '100%', borderRadius: '0.5rem', border: '1px solid #1f2937' }} />
                    ) : (
                        <div className="error-item">Missing left image file.</div>
                    )}
                </div>
                <div>
                    <div className="small-text" style={{ marginBottom: '0.25rem' }}>
                        Right image: <code>{trial.rightImage.path}</code>
                    </div>
                    {rightUrl ? (
                        <img src={rightUrl} alt="Right" style={{ width: '100%', borderRadius: '0.5rem', border: '1px solid #1f2937' }} />
                    ) : (
                        <div className="error-item">Missing right image file.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TrialDetailPanel;
