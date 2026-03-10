import { useEffect, useMemo } from 'react';

export function useObjectUrl(file: File | null, mimeType?: string): string | null {
    const stableKey = useMemo(() => {
        if (!file) return null;
        return `${file.name}::${file.size}::${file.lastModified}`;
    }, [file]);

    const url = useMemo(() => {
        if (!file || !stableKey) {
            return null;
        }

        const blob = mimeType ? new Blob([file], { type: mimeType }) : file;
        return URL.createObjectURL(blob);
    }, [file, stableKey, mimeType]);

    useEffect(() => {
        return () => {
            if (url) {
                URL.revokeObjectURL(url);
            }
        };
    }, [url]);

    return url;
}
