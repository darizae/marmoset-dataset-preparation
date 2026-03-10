export type StorageKind = 'local' | 'session';

interface StoredEnvelope<T> {
    version: number;
    value: T;
}

const STORAGE_VERSION = 1;

function getStorage(kind: StorageKind): Storage | null {
    if (typeof window === 'undefined') {
        return null;
    }
    return kind === 'local' ? window.localStorage : window.sessionStorage;
}

export function readStoredValue<T>(kind: StorageKind, key: string): T | null {
    const storage = getStorage(kind);
    if (!storage) return null;

    const raw = storage.getItem(key);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as StoredEnvelope<T>;
        if (!parsed || parsed.version !== STORAGE_VERSION) {
            storage.removeItem(key);
            return null;
        }
        return parsed.value;
    } catch {
        storage.removeItem(key);
        return null;
    }
}

export function writeStoredValue<T>(kind: StorageKind, key: string, value: T): void {
    const storage = getStorage(kind);
    if (!storage) return;
    const envelope: StoredEnvelope<T> = {
        version: STORAGE_VERSION,
        value
    };
    storage.setItem(key, JSON.stringify(envelope));
}

export function removeStoredValue(kind: StorageKind, key: string): void {
    const storage = getStorage(kind);
    storage?.removeItem(key);
}

export function clearStoredValues(keys: { kind: StorageKind; key: string }[]): void {
    for (const entry of keys) {
        removeStoredValue(entry.kind, entry.key);
    }
}
