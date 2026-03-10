import { DatasetManifest, IdentityDatasetEntry } from '../../domain/types';

export type BuildStep = 1 | 2 | 3 | 4 | 5;

export function inferFolderLabel(files: File[]): string {
    if (!files.length) return 'No folder selected';
    const anyFile = files[0] as File & { webkitRelativePath?: string };
    const rel = typeof anyFile.webkitRelativePath === 'string' ? anyFile.webkitRelativePath : files[0].name;
    if (!rel || !rel.includes('/')) return rel || 'Selected folder';
    return rel.split('/')[0];
}

export function isFocal(entry: IdentityDatasetEntry): boolean {
    const v = entry.properties?.focal;
    const s = String(v ?? '').trim().toLowerCase();
    return s === '1' || s === 'true';
}

function toLower(v: unknown): string {
    return String(v ?? '').trim().toLowerCase();
}

export function computePoolSummary(
    manifest: DatasetManifest,
    subjectId: string
): { partnerId: string; familiarWithMedia: number; unfamiliarWithMedia: number; errors: string[] } {
    const errors: string[] = [];
    const subject = manifest.identities.find((entry) => entry.id === subjectId);
    if (!subject) {
        return { partnerId: '', familiarWithMedia: 0, unfamiliarWithMedia: 0, errors: [`Subject not found: ${subjectId}`] };
    }

    const subjectSex = toLower(subject.properties?.sex);
    if (!subjectSex) errors.push(`Subject "${subjectId}" has no sex property.`);

    const partnerId = String(subject.properties?.partner_ID ?? subject.properties?.partnerId ?? subject.properties?.partner ?? '').trim();
    if (!partnerId) errors.push(`Subject "${subjectId}" is missing partner_ID.`);
    const partner = manifest.identities.find((entry) => entry.id === partnerId);
    if (!partner) errors.push(`Partner "${partnerId}" not found for subject "${subjectId}".`);

    const partnerSex = partner ? toLower(partner.properties?.sex) : '';
    if (!partnerSex) errors.push(`Partner "${partnerId}" has no sex property.`);
    if (subjectSex && partnerSex && subjectSex !== partnerSex) {
        errors.push(`Subject "${subjectId}" sex ("${subjectSex}") does not match partner "${partnerId}" sex ("${partnerSex}").`);
    }

    const sexToUse = subjectSex || partnerSex;

    const familiar = manifest.identities.filter(
        (entry) => entry.id !== subjectId && toLower(entry.properties?.sex) === sexToUse && toLower(entry.properties?.familiarity) === 'familiar'
    );
    const unfamiliar = manifest.identities.filter(
        (entry) => entry.id !== subjectId && toLower(entry.properties?.sex) === sexToUse && toLower(entry.properties?.familiarity) === 'unfamiliar'
    );

    return {
        partnerId,
        familiarWithMedia: familiar.filter((entry) => entry.imageExemplars.length > 0 && entry.audioExemplars.length > 0).length,
        unfamiliarWithMedia: unfamiliar.filter((entry) => entry.imageExemplars.length > 0 && entry.audioExemplars.length > 0).length,
        errors
    };
}
