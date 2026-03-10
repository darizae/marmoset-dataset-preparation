import { describe, expect, it } from 'vitest';
import { resolveSelectedTrialId } from './explorerSelection';
import { Trial } from '../../domain/trialTypes';

function buildTrial(trialId: string): Trial {
    return {
        trialId,
        trialNumber: 1,
        subjectId: 'S1',
        partnerId: 'P1',
        callIdentityId: 'P1',
        callCategory: 'familiar',
        isPartnerCall: true,
        otherIdentityId: 'O1',
        otherCategory: 'familiar',
        partnerSide: 'left',
        correctSide: 'left',
        audio: { identityId: 'P1', exemplarIndex: 1, path: 'audio.wav' },
        leftImage: { identityId: 'P1', exemplarIndex: 1, path: 'left.jpg' },
        rightImage: { identityId: 'O1', exemplarIndex: 1, path: 'right.jpg' },
        seed: '42'
    };
}

describe('resolveSelectedTrialId', () => {
    it('keeps the selected trial when it still matches filters', () => {
        const trials = [buildTrial('t1'), buildTrial('t2')];
        expect(resolveSelectedTrialId(trials, 't2')).toBe('t2');
    });

    it('falls back to the first visible trial when the selection becomes stale', () => {
        const trials = [buildTrial('t1'), buildTrial('t2')];
        expect(resolveSelectedTrialId(trials, 'missing')).toBe('t1');
    });

    it('clears the selection when nothing is visible', () => {
        expect(resolveSelectedTrialId([], 't1')).toBeNull();
    });
});
