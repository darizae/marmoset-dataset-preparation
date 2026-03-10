import { Alert, Stack } from '@mui/material';
import React, { useState } from 'react';
import FolderSelector from '../common/FolderSelector';
import PageSection from '../common/PageSection';
import ContextHelpButton from '../help/ContextHelpButton';
import { HelpTopicId } from '../help/helpTopics';
import { parseBundleFromDirectorySelection } from '../../domain/bundle/bundleParser';
import { TrialSet } from '../../domain/trialTypes';
import BundleExplorer from './BundleExplorer';
import { inferFolderLabel } from './bundleWorkflow';
import { usePersistentState, useSessionState } from '../../persistence/hooks';
import { storageKeys } from '../../persistence/keys';
import HelpHint from '../common/HelpHint';

interface Props {
    onOpenHelp: (topicId: HelpTopicId) => void;
}

const BundleExploreTab: React.FC<Props> = ({ onOpenHelp }) => {
    const [bundleFolderLabel, setBundleFolderLabel] = useState<string>('No folder selected');
    const [strictErrors, setStrictErrors] = useState<string[]>([]);
    const [trialSets, setTrialSets] = useState<Record<string, TrialSet>>({});
    const [mediaByInternalPath, setMediaByInternalPath] = useState<Map<string, File>>(new Map());
    const [lastLoadedBundleLabel, setLastLoadedBundleLabel] = useSessionState<string>(storageKeys.exploreSession, '');
    const [helpHintDismissed, setHelpHintDismissed] = usePersistentState<boolean>(`${storageKeys.appPreferences}.exploreHelpHintDismissed`, false);

    const onBundleFolderChange = async (filesList: FileList | null) => {
        setStrictErrors([]);
        setTrialSets({});
        setMediaByInternalPath(new Map());
        if (!filesList || filesList.length === 0) return;

        const files = Array.from(filesList);
        setBundleFolderLabel(inferFolderLabel(files));
        setLastLoadedBundleLabel(inferFolderLabel(files));

        try {
            const parsed = await parseBundleFromDirectorySelection(files);
            setTrialSets(parsed.trialSets);
            setMediaByInternalPath(parsed.mediaByInternalPath);
        } catch (error: any) {
            setStrictErrors([error?.message || String(error)]);
        }
    };

    return (
        <Stack spacing={3}>
            <HelpHint visible={!helpHintDismissed} onDismiss={() => setHelpHintDismissed(true)} />

            <PageSection
                title="Load bundle"
                description="Select a bundle root folder to inspect trial sets and preview the packaged media."
                action={<ContextHelpButton topicId="bundle-explorer" onOpen={onOpenHelp} label="Help" />}
            >
                <FolderSelector
                    onFolderChange={onBundleFolderChange}
                    folderLabel={bundleFolderLabel === 'No folder selected' && lastLoadedBundleLabel ? `${lastLoadedBundleLabel} (select again to reload)` : bundleFolderLabel}
                    helperText="Expected root files: dataset_meta.json, manifest.json, trial_sets/<subject>/trials.json, and media/."
                />
                {strictErrors.map((error) => (
                    <Alert key={error} severity="error">{error}</Alert>
                ))}
            </PageSection>

            {Object.keys(trialSets).length > 0 ? (
                <PageSection
                    title="Inspect bundle"
                    description="Review one subject at a time, filter the trial table, and confirm that preview media resolves from the bundle."
                    compact
                >
                    <BundleExplorer
                        trialSets={trialSets}
                        resolveMediaFile={(path) => mediaByInternalPath.get(path) || null}
                        strictErrors={strictErrors}
                        warnings={[]}
                        persistenceKey={`${storageKeys.exploreSession}.preview`}
                    />
                </PageSection>
            ) : null}
        </Stack>
    );
};

export default BundleExploreTab;
