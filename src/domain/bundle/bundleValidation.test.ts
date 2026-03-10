import { describe, expect, it } from 'vitest';
import { normalizeBundleAudioPath, normalizeBundleImagePath } from './bundleValidation';

describe('bundle media path normalization', () => {
    it('preserves nested relative paths under the bundle media directory', () => {
        expect(normalizeBundleImagePath('dataset/faces/A1.jpg', 'dataset')).toBe('media/images/faces/A1.jpg');
        expect(normalizeBundleAudioPath('dataset/audio/A1.wav', 'dataset')).toBe('media/audio/audio/A1.wav');
    });

    it('leaves already rootless paths stable', () => {
        expect(normalizeBundleImagePath('faces/A1.jpg', 'dataset')).toBe('media/images/faces/A1.jpg');
    });
});
