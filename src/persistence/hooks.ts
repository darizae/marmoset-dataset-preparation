import { useEffect, useState } from 'react';
import { readStoredValue, removeStoredValue, StorageKind, writeStoredValue } from './storage';

function useStoredState<T>(kind: StorageKind, key: string, initialValue: T) {
    const [value, setValue] = useState<T>(() => {
        const stored = readStoredValue<T>(kind, key);
        return stored ?? initialValue;
    });

    useEffect(() => {
        writeStoredValue(kind, key, value);
    }, [key, kind, value]);

    const clear = () => {
        removeStoredValue(kind, key);
        setValue(initialValue);
    };

    return [value, setValue, clear] as const;
}

export function usePersistentState<T>(key: string, initialValue: T) {
    return useStoredState('local', key, initialValue);
}

export function useSessionState<T>(key: string, initialValue: T) {
    return useStoredState('session', key, initialValue);
}
