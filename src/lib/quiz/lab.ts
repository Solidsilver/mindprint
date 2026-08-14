// The Lab: standalone, literature-named mini-tests. Each yields a raw measure
// (span, threshold, K…) plus a 0-100 score normalized against published adult
// norms as clamp(50 + 15·z) — i.e. the population mean lands at 50 and each
// 15 points is one standard deviation.
//
// Norm sources: VPT (Della Sala et al. 1997/99), digit span (WAIS tradition),
// Corsi (Kessels et al. 2000), anisochrony (BAASTA, Dalla Bella et al. 2017;
// ten Hoopen et al.), change detection K (Xu, Adam, Fang & Vogel 2018),
// PSE (Conrad & Hull 1964; Baddeley 1966 — demo-grade, norms rough).

import type { LabResult, LabTestId, ZSummary } from './types';

export type { LabResult, LabTestId };

export function normScore(value: number, mean: number, sd: number, higherBetter = true): number {
	const z = ((value - mean) / sd) * (higherBetter ? 1 : -1);
	return Math.max(0, Math.min(100, Math.round(50 + 15 * z)));
}

export interface LabTestMeta {
	id: LabTestId;
	name: string;
	dim: number; // channel index
	minutes: string;
	blurb: string;
	norm: string; // one-line published anchor, shown with results
	citation: string;
	/** which z slot the primary value occupies (see ZSummary docs) */
	zSlot: number;
	zSlot2?: number;
}

// z slots 0-7 are the tier-quiz summary (see scoring.ts). Lab appends:
// 8: VPT pattern span · 9: digit span forward · 10: digit span backward
// 11: Corsi span · 12: anisochrony threshold %IOI · 13: change-detection K
// 14: PSE delta (percentage points)
export const LAB_TESTS: LabTestMeta[] = [
	{
		id: 'vpt',
		name: 'Pattern Span',
		dim: 0,
		minutes: '~3 min',
		blurb: 'A grid flashes with half its cells filled. Reproduce it from memory. Visual memory without the spatial-sequence part.',
		norm: 'Adults average a span of ~9 filled cells (SD 2.2).',
		citation: 'Visual Patterns Test — Della Sala et al. 1997/1999',
		zSlot: 8
	},
	{
		id: 'digit',
		name: 'Digit Span',
		dim: 1,
		minutes: '~4 min',
		blurb: 'Digits appear one per second; repeat them back — then backwards. The original "7 ± 2" task.',
		norm: 'Adults average ~6.5 forward, ~4.8 backward.',
		citation: 'WAIS tradition; Jacobs 1887; Miller 1956',
		zSlot: 9,
		zSlot2: 10
	},
	{
		id: 'corsi',
		name: 'Corsi Blocks',
		dim: 2,
		minutes: '~4 min',
		blurb: 'Nine blocks light up in sequence. Tap them back in order. The classic spatial-memory task.',
		norm: 'Adults average a span of 6.2 (SD 1.3).',
		citation: 'Corsi 1972; Kessels et al. 2000',
		zSlot: 11
	},
	{
		id: 'aniso',
		name: 'Steady Beat',
		dim: 3,
		minutes: '~3 min',
		blurb: 'Two beat sequences — one has a hiccup. Which one? A staircase finds your timing threshold. Sound required.',
		norm: 'Non-musicians detect ~5–10% of the beat interval; sharp ears ~3.5%.',
		citation: 'Anisochrony detection — Hyde & Peretz 2004; BAASTA 2017',
		zSlot: 12
	},
	{
		id: 'cdk',
		name: 'Visual Buffer (K)',
		dim: 0,
		minutes: '~3 min',
		blurb: 'Colored squares flash for a fifth of a second. Did the probed one change? Estimates your visual working-memory capacity K.',
		norm: 'Typical adult K ≈ 2.1 (SD 0.8); classic lab estimates ~3–4.',
		citation: 'Luck & Vogel 1997; Xu et al. 2018',
		zSlot: 13
	},
	{
		id: 'pse',
		name: 'Inner Ear Demo',
		dim: 1,
		minutes: '~3 min',
		blurb: 'Recall letter lists — half rhyme with each other, half don’t. The rhyming ones are famously harder: proof your inner voice is doing the remembering.',
		norm: 'One of the largest effects in memory research; your personal delta is a fun signal, not a stable score.',
		citation: 'Phonological similarity effect — Conrad & Hull 1964; Baddeley 1966',
		zSlot: 14
	}
];

export const LAB_BY_ID: Record<LabTestId, LabTestMeta> = Object.fromEntries(
	LAB_TESTS.map((t) => [t.id, t])
) as Record<LabTestId, LabTestMeta>;

/** measurement error assigned to one lab test when blending into a channel */
export const LAB_SEM = 10;

/** Blend lab scores into per-channel ability using precision weighting. */
export function blendLabsIntoChannels(
	a: number[],
	e: number[],
	labs: Partial<Record<LabTestId, LabResult>>
): { a: number[]; e: number[] } {
	const outA = a.slice();
	const outE = e.slice();
	for (let dim = 0; dim < 4; dim++) {
		const contributions = [{ v: a[dim], w: 1 / (e[dim] * e[dim]) }];
		for (const meta of LAB_TESTS) {
			if (meta.dim !== dim) continue;
			const r = labs[meta.id];
			if (!r) continue;
			contributions.push({ v: r.score, w: 1 / (LAB_SEM * LAB_SEM) });
		}
		if (contributions.length === 1) continue;
		const wSum = contributions.reduce((s, c) => s + c.w, 0);
		outA[dim] = Math.round(contributions.reduce((s, c) => s + c.v * c.w, 0) / wSum);
		outE[dim] = Math.max(4, Math.round(Math.sqrt(1 / wSum)));
	}
	return { a: outA, e: outE };
}

/** Write lab values into their z slots (rounded to 1 decimal). */
export function labsIntoZ(z: ZSummary, labs: Partial<Record<LabTestId, LabResult>>): ZSummary {
	const out = z.slice();
	while (out.length < 15) out.push(null);
	const r1 = (v: number) => Math.round(v * 10) / 10;
	for (const meta of LAB_TESTS) {
		const r = labs[meta.id];
		if (!r) continue;
		out[meta.zSlot] = r1(r.value);
		if (meta.zSlot2 !== undefined && r.value2 !== null && r.value2 !== undefined) out[meta.zSlot2] = r1(r.value2);
	}
	return out;
}

/** Format a lab z-slot value for display (rooms, shared profiles). */
export function labValueFromZ(z: ZSummary, id: LabTestId): string | null {
	const meta = LAB_BY_ID[id];
	const v = z[meta.zSlot];
	if (typeof v !== 'number') return null;
	switch (id) {
		case 'vpt': return `span ${v}`;
		case 'digit': {
			const b = z[10];
			return `fwd ${v}${typeof b === 'number' ? ` · bwd ${b}` : ''}`;
		}
		case 'corsi': return `span ${v}`;
		case 'aniso': return `±${v}% of the beat`;
		case 'cdk': return `K ≈ ${v}`;
		case 'pse': return `Δ ${v} pts`;
	}
}
