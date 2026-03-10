export const storageKeys = {
    appPreferences: 'marmoset.app.preferences',
    appSession: 'marmoset.app.session',
    buildPreferences: 'marmoset.build.preferences',
    buildSession: 'marmoset.build.session',
    buildPreviewSession: 'marmoset.build.preview',
    exploreSession: 'marmoset.explore.session',
    resultsSession: 'marmoset.results.session'
} as const;

export const allStorageKeys = [
    { kind: 'local' as const, key: storageKeys.appPreferences },
    { kind: 'session' as const, key: storageKeys.appSession },
    { kind: 'local' as const, key: storageKeys.buildPreferences },
    { kind: 'session' as const, key: storageKeys.buildSession },
    { kind: 'session' as const, key: storageKeys.buildPreviewSession },
    { kind: 'session' as const, key: storageKeys.exploreSession },
    { kind: 'session' as const, key: storageKeys.resultsSession }
];
