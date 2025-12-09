export type RNG = {
    next: () => number;
};

function mulberry32(seed: number): RNG {
    let t = seed >>> 0;
    return {
        next: () => {
            t += 0x6d2b79f5;
            let r = Math.imul(t ^ (t >>> 15), 1 | t);
            r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
            return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
        }
    };
}

export function hashStringToInt(s: string): number {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

export function createRng(seedStr: string): RNG {
    const seed = hashStringToInt(seedStr);
    return mulberry32(seed);
}

export function shuffleInPlace<T>(arr: T[], rng: RNG): void {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

export function pickOne<T>(arr: T[], rng: RNG): T {
    const idx = Math.floor(rng.next() * arr.length);
    return arr[idx];
}
