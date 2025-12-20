import React from 'react';

type BuildStep = 1 | 2 | 3 | 4 | 5;

interface Props {
    mode: 'build' | 'visualize';
    step: BuildStep;
    setStep: (step: BuildStep) => void;
    canGoToStep: (step: BuildStep) => boolean;
}

const BundleStepHeader: React.FC<Props> = ({ mode, step, setStep, canGoToStep }) => {
    if (mode === 'visualize') {
        return (
            <div className="stepper" style={{ marginBottom: '0.75rem' }}>
                <span className="step-chip step-chip-active">Visualize bundle</span>
                <span className="small-text">Load a bundle directory and explore/verify trials + media.</span>
            </div>
        );
    }

    const steps: { id: BuildStep; label: string }[] = [
        { id: 1, label: 'Select dataset' },
        { id: 2, label: 'Choose subjects' },
        { id: 3, label: 'Tune generation' },
        { id: 4, label: 'Explore + validate' },
        { id: 5, label: 'Download zip' }
    ];

    return (
        <div className="stepper" style={{ marginBottom: '0.75rem' }}>
            {steps.map((s) => {
                const active = s.id === step;
                const enabled = canGoToStep(s.id);
                return (
                    <button
                        key={s.id}
                        className={`step-chip ${active ? 'step-chip-active' : ''}`}
                        disabled={!enabled || active}
                        onClick={() => setStep(s.id)}
                        title={!enabled ? 'Complete earlier steps first.' : ''}
                    >
                        <span style={{ fontWeight: 600 }}>{s.id}</span>
                        <span>{s.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default BundleStepHeader;
