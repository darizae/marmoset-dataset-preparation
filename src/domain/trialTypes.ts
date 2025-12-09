export type Side = 'left' | 'right';

export interface TrialConfig {
    totalTrials: number;
    familiarFraction: number;
    partnerFractionWithinFamiliar: number;
    balanceSides: boolean;
    avoidRepeatPairings: boolean;
    seed: string;
}

export interface TrialStimulus {
    identityId: string;
    exemplarIndex: number;
    path: string;
}

export interface Trial {
    trialId: string;
    trialNumber: number;
    subjectId: string;
    partnerId: string;
    callIdentityId: string;
    callCategory: 'familiar' | 'unfamiliar';
    isPartnerCall: boolean;
    otherIdentityId: string;
    otherCategory: 'familiar' | 'unfamiliar';
    partnerSide: Side;
    correctSide: Side;
    audio: TrialStimulus;
    leftImage: TrialStimulus & { identityId: string };
    rightImage: TrialStimulus & { identityId: string };
    seed: string;
}

export interface TrialGenerationWarning {
    message: string;
}

export interface TrialSetMeta {
    subjectId: string;
    partnerId: string;
    totalTrials: number;
    seed: string;
    dataDirLabel: string;
    generatedAt: string;
    config: TrialConfig;
    warnings: TrialGenerationWarning[];
}

export interface TrialSet {
    meta: TrialSetMeta;
    trials: Trial[];
}
