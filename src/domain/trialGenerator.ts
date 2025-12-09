import { DatasetManifest, IdentityDatasetEntry } from './types';
import { Trial, TrialConfig, TrialSet, TrialGenerationWarning, TrialStimulus, Side } from './trialTypes';
import { createRng, shuffleInPlace, pickOne, hashStringToInt } from './rng';

type PairKey = string;

class ExemplarPairManager {
    private audioOrder: number[];
    private imageOrder: number[];
    private aPtr = 0;
    private iPtr = 0;
    private used: Set<PairKey> = new Set();
    private audioIdxToPath: Map<number, string>;
    private imageIdxToPath: Map<number, string>;
    private avoidRepeat: boolean;

    constructor(images: { index: number; relativePath: string }[], audios: { index: number; relativePath: string }[], rng: ReturnType<typeof createRng>, avoidRepeat: boolean) {
        this.audioOrder = audios.map((e) => e.index);
        this.imageOrder = images.map((e) => e.index);
        shuffleInPlace(this.audioOrder, rng);
        shuffleInPlace(this.imageOrder, rng);
        this.audioIdxToPath = new Map(audios.map((e) => [e.index, e.relativePath]));
        this.imageIdxToPath = new Map(images.map((e) => [e.index, e.relativePath]));
        this.avoidRepeat = avoidRepeat;
    }

    nextPair(): { audioIndex: number; audioPath: string; imageIndex: number; imagePath: string } {
        if (this.audioOrder.length === 0 || this.imageOrder.length === 0) {
            throw new Error('No available exemplars for pairing.');
        }
        let tries = 0;
        const aIdx = this.audioOrder[this.aPtr % this.audioOrder.length];
        let iCandidate = this.imageOrder[this.iPtr % this.imageOrder.length];
        if (this.avoidRepeat) {
            while (tries < this.imageOrder.length && this.used.has(`${aIdx}-${iCandidate}`)) {
                this.iPtr++;
                iCandidate = this.imageOrder[this.iPtr % this.imageOrder.length];
                tries++;
            }
            if (tries >= this.imageOrder.length) {
                this.used.clear();
            }
        }
        const imgIdx = iCandidate;
        this.aPtr++;
        this.iPtr++;
        const audioPath = this.audioIdxToPath.get(aIdx) || '';
        const imagePath = this.imageIdxToPath.get(imgIdx) || '';
        this.used.add(`${aIdx}-${imgIdx}`);
        return { audioIndex: aIdx, audioPath, imageIndex: imgIdx, imagePath };
    }

    nextImageOnly(): { imageIndex: number; imagePath: string } {
        if (this.imageOrder.length === 0) {
            throw new Error('No available image exemplars.');
        }
        const imgIdx = this.imageOrder[this.iPtr % this.imageOrder.length];
        this.iPtr++;
        const imagePath = this.imageIdxToPath.get(imgIdx) || '';
        return { imageIndex: imgIdx, imagePath };
    }
}

function valStr(v: any): string {
    if (v === null || v === undefined) return '';
    return String(v);
}

function lowerStr(v: any): string {
    return valStr(v).toLowerCase();
}

function identityById(manifest: DatasetManifest, id: string): IdentityDatasetEntry | null {
    const x = manifest.identities.find((e) => e.id === id);
    return x || null;
}

function ensureNonEmpty<T>(arr: T[], msg: string) {
    if (!arr.length) {
        throw new Error(msg);
    }
}

type Category = 'familiar' | 'unfamiliar';

function buildPools(manifest: DatasetManifest, subjectId: string): {
    subject: IdentityDatasetEntry;
    partner: IdentityDatasetEntry;
    partnerSex: string;
    familiar: IdentityDatasetEntry[];
    unfamiliar: IdentityDatasetEntry[];
} {
    const subj = identityById(manifest, subjectId);
    if (!subj) throw new Error(`Subject ID not found: ${subjectId}`);
    const partnerId = valStr(subj.properties?.partner_ID || subj.properties?.partnerId || subj.properties?.partner).trim();
    if (!partnerId) throw new Error('Selected subject has no partner_ID in the prepared manifest.');
    const partner = identityById(manifest, partnerId);
    if (!partner) throw new Error(`Partner "${partnerId}" not found in prepared manifest.`);
    const partnerSex = lowerStr(partner.properties?.sex);
    if (!partnerSex) throw new Error('Partner has no sex property.');
    const fam: IdentityDatasetEntry[] = [];
    const unfam: IdentityDatasetEntry[] = [];
    for (const e of manifest.identities) {
        if (e.id === subjectId) continue;
        const sex = lowerStr(e.properties?.sex);
        if (sex !== partnerSex) continue;
        const famStr = lowerStr(e.properties?.familiarity);
        if (famStr === 'familiar') fam.push(e);
        else if (famStr === 'unfamiliar') unfam.push(e);
    }
    return { subject: subj, partner: partner, partnerSex, familiar: fam, unfamiliar: unfam };
}

function computeCounts(total: number, familiarFraction: number, partnerFractionWithinFamiliar: number, available: {
    familiarNonPartner: number;
    unfamiliar: number;
    partner: number;
}): { nPartner: number; nFamiliarNonPartner: number; nUnfamiliar: number; warnings: TrialGenerationWarning[] } {
    const warnings: TrialGenerationWarning[] = [];
    let nFamiliar = Math.round(total * familiarFraction);
    let nUnfamiliar = total - nFamiliar;
    let nPartner = Math.round(nFamiliar * partnerFractionWithinFamiliar);
    let nFamiliarNonPartner = nFamiliar - nPartner;

    if (available.partner <= 0) {
        warnings.push({ message: 'No partner available with media; partner-call trials set to 0.' });
        nFamiliarNonPartner += nPartner;
        nPartner = 0;
    }
    if (available.familiarNonPartner <= 0) {
        warnings.push({ message: 'No familiar non-partner identities available; reassigning familiar trials to partner where possible.' });
        nPartner += nFamiliarNonPartner;
        nFamiliarNonPartner = 0;
    }
    if (available.unfamiliar <= 0) {
        warnings.push({ message: 'No unfamiliar identities available; all trials will be familiar.' });
        nFamiliarNonPartner += nUnfamiliar;
        nUnfamiliar = 0;
    }
    const maxPartner = available.partner;
    if (nPartner > 0 && maxPartner <= 0) nPartner = 0;
    const maxFamNP = available.familiarNonPartner;
    if (nFamiliarNonPartner > 0 && maxFamNP <= 0) nFamiliarNonPartner = 0;
    const maxUnfam = available.unfamiliar;
    if (nUnfamiliar > 0 && maxUnfam <= 0) nUnfamiliar = 0;

    return { nPartner, nFamiliarNonPartner, nUnfamiliar, warnings };
}

function buildSessionId(subjectId: string, seed: string): string {
    const s = `${subjectId}::${seed}`;
    const h = hashStringToInt(s).toString(36);
    return h.slice(0, 6);
}

export function generateTrials(manifest: DatasetManifest, subjectId: string, config: TrialConfig): TrialSet {
    const rng = createRng(config.seed);
    const { subject, partner, familiar, unfamiliar } = buildPools(manifest, subjectId);

    ensureNonEmpty(partner.imageExemplars, 'Partner has no image exemplars.');
    ensureNonEmpty(partner.audioExemplars, 'Partner has no audio exemplars.');

    const familiarNonPartner = familiar.filter((e) => e.id !== partner.id);
    const famWithMedia = familiarNonPartner.filter((e) => e.imageExemplars.length > 0 && e.audioExemplars.length > 0);
    const unfamWithMedia = unfamiliar.filter((e) => e.imageExemplars.length > 0 && e.audioExemplars.length > 0);
    const partnerHasMedia = partner.imageExemplars.length > 0 && partner.audioExemplars.length > 0 ? 1 : 0;

    const counts = computeCounts(
        config.totalTrials,
        config.familiarFraction,
        config.partnerFractionWithinFamiliar,
        {
            familiarNonPartner: famWithMedia.length,
            unfamiliar: unfamWithMedia.length,
            partner: partnerHasMedia
        }
    );
    const warnings: TrialGenerationWarning[] = [...counts.warnings];

    const sessionId = buildSessionId(subject.id, config.seed);

    const partnerMgr = new ExemplarPairManager(
        partner.imageExemplars.map((e) => ({ index: e.index, relativePath: e.relativePath })),
        partner.audioExemplars.map((e) => ({ index: e.index, relativePath: e.relativePath })),
        rng,
        config.avoidRepeatPairings
    );

    const idToImageMgr = new Map<string, ExemplarPairManager>();
    const idToCallMgr = new Map<string, ExemplarPairManager>();

    function getMgrForCall(identity: IdentityDatasetEntry): ExemplarPairManager {
        const key = identity.id;
        const existing = idToCallMgr.get(key);
        if (existing) return existing;
        const mgr = new ExemplarPairManager(
            identity.imageExemplars.map((e) => ({ index: e.index, relativePath: e.relativePath })),
            identity.audioExemplars.map((e) => ({ index: e.index, relativePath: e.relativePath })),
            rng,
            config.avoidRepeatPairings
        );
        idToCallMgr.set(key, mgr);
        return mgr;
    }

    function getMgrForImagesOnly(identity: IdentityDatasetEntry): ExemplarPairManager {
        const key = identity.id;
        const existing = idToImageMgr.get(key);
        if (existing) return existing;
        const mgr = new ExemplarPairManager(
            identity.imageExemplars.map((e) => ({ index: e.index, relativePath: e.relativePath })),
            identity.audioExemplars.length ? identity.audioExemplars.map((e) => ({ index: e.index, relativePath: e.relativePath })) : [{ index: 1, relativePath: '' }],
            rng,
            false
        );
        idToImageMgr.set(key, mgr);
        return mgr;
    }

    const trials: Trial[] = [];

    const familiarCallIds: string[] = [];
    for (let i = 0; i < counts.nPartner; i++) familiarCallIds.push(partner.id);
    const famNpIdsPool = famWithMedia.map((e) => e.id);
    for (let i = 0; i < counts.nFamiliarNonPartner; i++) {
        familiarCallIds.push(pickOne(famNpIdsPool, rng));
    }

    const unfamIdsPool = unfamWithMedia.map((e) => e.id);
    const unfamiliarCallIds: string[] = [];
    for (let i = 0; i < counts.nUnfamiliar; i++) unfamiliarCallIds.push(pickOne(unfamIdsPool, rng));

    const scheduledCalls: { id: string; category: Category }[] = [];
    for (const id of familiarCallIds) scheduledCalls.push({ id, category: 'familiar' });
    for (const id of unfamiliarCallIds) scheduledCalls.push({ id, category: 'unfamiliar' });

    shuffleInPlace(scheduledCalls, rng);

    const partnerOnLeftCount = config.balanceSides ? Math.floor(scheduledCalls.length / 2) : -1;
    let assignedLeft = 0;

    for (let idx = 0; idx < scheduledCalls.length; idx++) {
        const cell = scheduledCalls[idx];
        const isPartnerCall = cell.id === partner.id;
        const callIdentity = isPartnerCall ? partner : identityById(manifest, cell.id)!;
        if (!callIdentity) throw new Error('Call identity not found during generation.');
        const callMgr = getMgrForCall(callIdentity);
        const pair = callMgr.nextPair();

        let otherIdentity: IdentityDatasetEntry;
        if (!isPartnerCall) {
            otherIdentity = callIdentity;
        } else {
            const otherPool = [...famWithMedia, ...unfamWithMedia].filter((e) => e.id !== partner.id);
            ensureNonEmpty(otherPool, 'No suitable "other" identities available.');
            otherIdentity = pickOne(otherPool, rng);
        }

        const otherCategory: Category = familiar.some((e) => e.id === otherIdentity.id) ? 'familiar' : 'unfamiliar';

        const partnerSide: Side = config.balanceSides
            ? assignedLeft < partnerOnLeftCount
                ? 'left'
                : 'right'
            : rng.next() < 0.5
                ? 'left'
                : 'right';
        if (config.balanceSides && partnerSide === 'left') assignedLeft++;

        let leftImage: TrialStimulus & { identityId: string };
        let rightImage: TrialStimulus & { identityId: string };

        if (partnerSide === 'left') {
            const partnerImg = partnerMgr.nextImageOnly();
            const otherImgMgr = getMgrForImagesOnly(otherIdentity);
            const otherImg = otherImgMgr.nextImageOnly();
            leftImage = { identityId: partner.id, exemplarIndex: partnerImg.imageIndex, path: partnerImg.imagePath };
            rightImage = { identityId: otherIdentity.id, exemplarIndex: otherImg.imageIndex, path: otherImg.imagePath };
        } else {
            const partnerImg = partnerMgr.nextImageOnly();
            const otherImgMgr = getMgrForImagesOnly(otherIdentity);
            const otherImg = otherImgMgr.nextImageOnly();
            rightImage = { identityId: partner.id, exemplarIndex: partnerImg.imageIndex, path: partnerImg.imagePath };
            leftImage = { identityId: otherIdentity.id, exemplarIndex: otherImg.imageIndex, path: otherImg.imagePath };
        }

        const correctSide: Side = isPartnerCall
            ? partnerSide
            : leftImage.identityId === callIdentity.id
                ? 'left'
                : 'right';

        const audio: TrialStimulus = {
            identityId: callIdentity.id,
            exemplarIndex: pair.audioIndex,
            path: pair.audioPath
        };

        const trialId = `${subject.id}-${sessionId}-${idx + 1}`;
        const trial: Trial = {
            trialId,
            trialNumber: idx + 1,
            subjectId: subject.id,
            partnerId: partner.id,
            callIdentityId: callIdentity.id,
            callCategory: cell.category,
            isPartnerCall,
            otherIdentityId: otherIdentity.id,
            otherCategory,
            partnerSide,
            correctSide,
            audio,
            leftImage,
            rightImage,
            seed: config.seed
        };
        trials.push(trial);
    }

    const meta = {
        subjectId: subject.id,
        partnerId: partner.id,
        totalTrials: trials.length,
        seed: config.seed,
        dataDirLabel: manifest.meta?.dataDirLabel || 'dataset',
        generatedAt: new Date().toISOString(),
        config,
        warnings
    };

    return { meta, trials };
}
