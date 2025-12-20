import { useEffect, useMemo, useState } from 'react';

export function useObjectUrl(file: File | null, mimeType?: string): string | null {
    const stableKey = useMemo(() => {
        if (!file) return null;
        return `${file.name}::${file.size}::${file.lastModified}`;
    }, [file]);

    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!file || !stableKey) {
            setUrl(null);
            return;
        }

        const blob = mimeType ? new Blob([file], { type: mimeType }) : file;
        const nextUrl = URL.createObjectURL(blob);
        setUrl(nextUrl);

        return () => {
            URL.revokeObjectURL(nextUrl);
        };
    }, [file, stableKey, mimeType]);

    return url;
}
