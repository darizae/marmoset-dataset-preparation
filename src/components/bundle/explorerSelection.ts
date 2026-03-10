import { Trial } from '../../domain/trialTypes';

export function resolveSelectedTrialId(
    filteredTrials: Trial[],
    selectedTrialId: string | null
): string | null {
    if (!filteredTrials.length) {
        return null;
    }

    if (selectedTrialId && filteredTrials.some((trial) => trial.trialId === selectedTrialId)) {
        return selectedTrialId;
    }

    return filteredTrials[0].trialId;
}
