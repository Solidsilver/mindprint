import { TIER_INFO } from './questions';
import { labsIntoZ } from './lab';
import type {
	Answer,
	KinAnswer,
	LabResult,
	LabTestId,
	LikertAnswer,
	PlaneAnswer,
	PuzzleAnswer,
	Question,
	Sitting,
	TierName,
	VviqAnswer,
	ZSummary
} from './types';

export const isVal = (a: unknown): boolean => a !== null && a !== 'N/A' && a !== undefined;

export function shuffle<T>(arr: readonly T[]): T[] {
	const a = arr.slice();
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}
export function sample<T>(arr: readonly T[], n: number): T[] {
	return shuffle(arr).slice(0, n);
}
export function median(arr: number[]): number {
	const s = arr.slice().sort((a, b) => a - b);
	const m = Math.floor(s.length / 2);
	return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Correction for guessing: raw accuracy at the chance rate carries no information.
export function chanceCorrect(pctCorrect: number, chance: number): number {
	return Math.max(0, Math.min(100, (pctCorrect - chance * 100) / (1 - chance)));
}

export function kinBand(err: number): { label: string; cls: 'good' | 'warn' | 'bad' } {
	if (err <= 35) return { label: 'Musician-tight', cls: 'good' };
	if (err <= 65) return { label: 'Typical', cls: 'good' };
	if (err <= 105) return { label: 'A bit loose', cls: 'warn' };
	return { label: 'Free-jazz', cls: 'bad' };
}

// Score by drift as a % of the interval (Repp 2005: typical adults ~3-6% CV,
// musicians ~2%). Full marks at <=2.5%, zero at >=20%.
export function kinScore(avgErr: number, interval: number): number {
	const errPct = (avgErr / interval) * 100;
	return Math.max(0, Math.min(100, Math.round(100 - Math.max(0, errPct - 2.5) * (100 / 17.5))));
}

export function localDate(): string {
	const n = new Date();
	return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

// Weights: plane 1x, each likert item 1x, mini-VVIQ 3x (it's 5 real items),
// objective puzzle 2x/3x/4x by tier (more trials = more trustworthy).
function puzzleWeight(tier: TierName): number {
	return tier === 'quick' ? 2 : tier === 'standard' ? 3 : 4;
}

export interface DimResult {
	ability: number | null;
	usage: number | null;
	skipped: boolean;
	partial: boolean;
}

export function calcDim(questions: Question[], answers: Answer[], dimIdx: number, tier: TierName): DimResult {
	const abilityScores: number[] = [];
	const usageScores: number[] = [];
	questions.forEach((q, qi) => {
		if (q.dim !== dimIdx) return;
		const ans = answers[qi];
		if (!isVal(ans) || typeof ans !== 'object' || ans === null) return;
		if (q.role === 'plane') {
			const a = ans as PlaneAnswer;
			abilityScores.push(a.capacity);
			usageScores.push(a.usage);
		} else if (q.role === 'likert' && 'values' in ans) {
			const a = ans as LikertAnswer;
			q.items.forEach((item, ii) => {
				if (item.ortho) return; // orthographic imagery reported separately
				const v = a.values[ii];
				if (v === null || v === undefined) return;
				(item.measures === 'ability' ? abilityScores : usageScores).push(v);
			});
		} else if (q.role === 'vviq') {
			const a = ans as VviqAnswer;
			for (let k = 0; k < 3; k++) abilityScores.push(a.score);
		} else if (q.role === 'puzzle') {
			const a = ans as PuzzleAnswer;
			for (let k = 0; k < puzzleWeight(tier); k++) abilityScores.push(a.score);
		} else if (q.role === 'labtest' && 'score' in ans) {
			// norm-scaled lab score, weighted like a heavy objective test
			const a = ans as LabResult;
			for (let k = 0; k < 3; k++) abilityScores.push(a.score);
		}
	});
	const avg = (arr: number[]): number | null => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
	return {
		ability: avg(abilityScores),
		usage: avg(usageScores),
		skipped: abilityScores.length === 0 && usageScores.length === 0,
		partial: abilityScores.length === 0 || usageScores.length === 0
	};
}

export function puzzleSummary(questions: Question[], answers: Answer[]): ZSummary {
	// z = [memDetail, rhymeDetail, rotDetail, kinErrMs, kinSignedMs, vviq16, ortho, rotMedRTms]
	const byType = (t: string): Answer => answers[questions.findIndex((q) => q.type === t)] ?? null;
	const det = (a: Answer): string | null =>
		isVal(a) && typeof a === 'object' && a !== null && 'detail' in a ? (a as PuzzleAnswer).detail : null;
	const mem = byType('puzzle-visual');
	const rhy = byType('puzzle-verbal');
	const rot = byType('puzzle-spatial');
	const kinAns = byType('puzzle-kinesthetic');
	const kin = isVal(kinAns) && typeof kinAns === 'object' ? (kinAns as KinAnswer) : null;
	const vviqIdx = questions.findIndex((q) => q.type === 'vviq');
	const vviqRaw = vviqIdx >= 0 ? answers[vviqIdx] : null;
	const vviq = isVal(vviqRaw) && typeof vviqRaw === 'object' ? (vviqRaw as VviqAnswer) : null;
	let ortho: number | null = null;
	questions.forEach((q, qi) => {
		if (q.role !== 'likert') return;
		const ans = answers[qi];
		if (!isVal(ans) || typeof ans !== 'object' || ans === null || !('values' in ans)) return;
		const a = ans as LikertAnswer;
		q.items.forEach((item, ii) => {
			if (item.ortho && a.values[ii] !== null && a.values[ii] !== undefined) ortho = a.values[ii];
		});
	});
	const rotAns = isVal(rot) && typeof rot === 'object' ? (rot as PuzzleAnswer) : null;
	const base: ZSummary = [
		det(mem),
		det(rhy),
		det(rot),
		kin ? Math.round(kin.avgError) : null,
		kin ? Math.round(kin.meanSigned) : null,
		vviq ? vviq.vviq : null,
		ortho,
		rotAns && rotAns.medRT ? Math.round(rotAns.medRT) : null
	];
	// inline lab tests (Thorough tier) write their z slots too
	const labs: Partial<Record<LabTestId, LabResult>> = {};
	questions.forEach((q, qi) => {
		const ans = answers[qi];
		if (q.role === 'labtest' && ans !== null && typeof ans === 'object' && 'id' in ans) {
			labs[(ans as LabResult).id] = ans as LabResult;
		}
	});
	return labsIntoZ(base, labs);
}

export function buildSitting(
	questions: Question[],
	answers: Answer[],
	tier: TierName
): { sitting: Sitting; skips: boolean[] } {
	const sitting: Sitting = { d: localDate(), t: tier, a: [], u: [], e: [], z: puzzleSummary(questions, answers) };
	const skips: boolean[] = [];
	for (let i = 0; i < 4; i++) {
		const dim = calcDim(questions, answers, i, tier);
		sitting.a.push(dim.ability !== null ? Math.round(dim.ability) : 50);
		sitting.u.push(dim.usage !== null ? Math.round(dim.usage) : 50);
		let e = TIER_INFO[tier].sem;
		if (dim.skipped) e = 20;
		else if (dim.partial) e = Math.min(20, Math.round(e * 1.5));
		sitting.e.push(e);
		skips.push(dim.skipped);
	}
	return { sitting, skips };
}

// Precision-weighted average across sittings (weight = 1/SEM^2), the standard
// way to pool repeated measurements; combined error shrinks roughly with sqrt(N).
export function combineHistory(hist: Sitting[]): { a: number[]; u: number[]; e: number[] } {
	const a: number[] = [];
	const u: number[] = [];
	const e: number[] = [];
	for (let j = 0; j < 4; j++) {
		let wSum = 0,
			aAcc = 0,
			uAcc = 0;
		hist.forEach((s) => {
			const w = 1 / (s.e[j] * s.e[j]);
			wSum += w;
			aAcc += s.a[j] * w;
			uAcc += s.u[j] * w;
		});
		a.push(Math.round(aAcc / wSum));
		u.push(Math.round(uAcc / wSum));
		e.push(Math.max(4, Math.round(Math.sqrt(1 / wSum))));
	}
	return { a, u, e };
}

export function mergedZ(hist: Sitting[]): ZSummary {
	const z: ZSummary = [null, null, null, null, null, null, null, null];
	hist.forEach((s) =>
		(s.z || []).forEach((v, i) => {
			if (v !== null && v !== undefined) z[i] = v;
		})
	);
	return z;
}

export function validProfile(p: unknown): boolean {
	const q = p as { a?: unknown; u?: unknown } | null;
	return Boolean(
		q &&
			Array.isArray(q.a) &&
			q.a.length === 4 &&
			Array.isArray(q.u) &&
			q.u.length === 4 &&
			q.a.every((x) => typeof x === 'number') &&
			q.u.every((x) => typeof x === 'number')
	);
}
