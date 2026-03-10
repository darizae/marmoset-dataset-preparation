import { Step, StepButton, Stepper } from '@mui/material';
import React from 'react';
import { BuildStep } from './bundleWorkflow';

interface Props {
    step: BuildStep;
    setStep: (step: BuildStep) => void;
    canGoToStep: (step: BuildStep) => boolean;
}

const BundleStepHeader: React.FC<Props> = ({ step, setStep, canGoToStep }) => {
    const steps: { id: BuildStep; label: string }[] = [
        { id: 1, label: 'Dataset' },
        { id: 2, label: 'Choose subjects' },
        { id: 3, label: 'Settings' },
        { id: 4, label: 'Preview' },
        { id: 5, label: 'Export' }
    ];

    return (
        <Stepper nonLinear activeStep={step - 1}>
            {steps.map((s) => {
                const enabled = canGoToStep(s.id);
                return (
                    <Step key={s.id} completed={s.id < step}>
                        <StepButton disabled={!enabled} onClick={() => setStep(s.id)}>
                            {s.label}
                        </StepButton>
                    </Step>
                );
            })}
        </Stepper>
    );
};

export default BundleStepHeader;
