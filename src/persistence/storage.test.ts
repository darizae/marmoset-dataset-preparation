import { beforeEach, describe, expect, it } from 'vitest';
import { clearStoredValues, readStoredValue, writeStoredValue } from './storage';

describe('storage helpers', () => {
    beforeEach(() => {
        window.localStorage.clear();
        window.sessionStorage.clear();
    });

    it('round-trips valid stored values', () => {
        writeStoredValue('local', 'test.key', { value: 42 });
        expect(readStoredValue<{ value: number }>('local', 'test.key')).toEqual({ value: 42 });
    });

    it('ignores malformed payloads', () => {
        window.localStorage.setItem('bad.key', '{');
        expect(readStoredValue('local', 'bad.key')).toBeNull();
        expect(window.localStorage.getItem('bad.key')).toBeNull();
    });

    it('clears local and session keys', () => {
        writeStoredValue('local', 'local.key', 'a');
        writeStoredValue('session', 'session.key', 'b');

        clearStoredValues([
            { kind: 'local', key: 'local.key' },
            { kind: 'session', key: 'session.key' }
        ]);

        expect(readStoredValue('local', 'local.key')).toBeNull();
        expect(readStoredValue('session', 'session.key')).toBeNull();
    });
});
