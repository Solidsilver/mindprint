// Question banks and tier configuration.
// Items drawn or adapted from openly published instruments:
// IRQ (Roebuck & Lupyan 2020), VISQ (McCarthy-Jones & Fernyhough 2011),
// OSIVQ (Blazhenkova & Kozhevnikov 2009), MIQ/KVIQ style for kinesthetic.

import type { Dim, LikertItem, PuzzleType, Question, TierInfo, TierName } from './types';

export const DIMS: Dim[] = [
	{
		key: 'Visual',
		sub: "The mind's eye",
		glyph:
			'<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>'
	},
	{
		key: 'Verbal',
		sub: 'The inner voice',
		glyph:
			'<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 12c0 4.556-4.03 8.25-9 8.25a9.76 9.76 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/></svg>'
	},
	{
		key: 'Spatial',
		sub: 'The mental map',
		glyph:
			'<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"/></svg>'
	},
	{
		key: 'Kinesthetic',
		sub: 'The felt body',
		glyph:
			'<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.05 4.575a1.575 1.575 0 10-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 013.15 0v1.5m-3.15 0l.075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 013.15 0V15M6.9 7.575a1.575 1.575 0 10-3.15 0v8.175a6.75 6.75 0 006.75 6.75h2.018a5.25 5.25 0 003.712-1.538l1.732-1.732a5.25 5.25 0 001.538-3.712l.003-2.024a.668.668 0 01.198-.471 1.575 1.575 0 10-2.228-2.228 3.818 3.818 0 00-1.12 2.687"/></svg>'
	}
];

// sem values are rough standard-errors-of-measurement per axis on the 0-100 scale,
// hand-derived via Spearman-Brown from the item counts (assumed pop. SD ~20):
// quick r~.55, standard r~.78, thorough r~.88.
export const TIER_INFO: Record<TierName, TierInfo> = {
	quick: { label: 'Quick', sem: 13, mem: 2, rhyme: 2, rot: 2, taps: [{ n: 6, int: 1000 }] },
	standard: { label: 'Standard', sem: 9, mem: 6, rhyme: 6, rot: 6, taps: [{ n: 10, int: 1000 }] },
	thorough: {
		label: 'Thorough',
		sem: 7,
		mem: 10,
		rhyme: 10,
		rot: 12,
		taps: [
			{ n: 10, int: 1000 },
			{ n: 10, int: 600 }
		]
	}
};

export const PLANE_QS: { text: string; subtext: string }[] = [
	{
		text: 'Imagine a red apple on a table. How clearly do you see it — and how often do images like this appear on their own?',
		subtext:
			"<strong>Up/Down (Ability):</strong> I can summon a photorealistic image vs. I can't picture it at all.<br><strong>Left/Right (Usage):</strong> Images pop into my head constantly vs. only when I actively try."
	},
	{
		text: 'When reading a book or thinking through a problem, do you hear a voice in your head?',
		subtext:
			"<strong>Up/Down (Ability):</strong> I can generate a clear mental voice (accent and all) vs. I can't hear a mental voice.<br><strong>Left/Right (Usage):</strong> My mind narrates constantly vs. my mind is verbally silent."
	},
	{
		text: 'When packing a car trunk or navigating a new building, do you mentally map it out?',
		subtext:
			'<strong>Up/Down (Ability):</strong> I can effortlessly rotate 3D objects and layouts in my head vs. I struggle to picture arrangements.<br><strong>Left/Right (Usage):</strong> I constantly think in spatial layouts vs. rarely.'
	},
	{
		text: 'When recalling a favorite song or watching a sport, do you feel it in your body?',
		subtext:
			'<strong>Up/Down (Ability):</strong> I can perfectly rehearse a physical motion in my mind vs. I struggle to ‘feel’ it.<br><strong>Left/Right (Usage):</strong> I constantly feel rhythms and physical urges while thinking vs. rarely.'
	}
];

export const LIKERT_BANK: LikertItem[][] = [
	[
		// Visual — in Thorough, ability comes from the mini-VVIQ block instead
		{ text: 'My mental images are very vivid and photographic.', measures: 'ability', tiers: ['quick', 'standard'], note: 'Verbatim from the IRQ (Roebuck & Lupyan 2020).' },
		{ text: 'I can close my eyes and easily picture a scene that I have experienced.', measures: 'ability', tiers: ['standard'], note: 'Verbatim from the IRQ.' },
		{ text: 'When I read a story, I automatically see the scenes play out like a movie.', measures: 'usage', tiers: ['standard', 'thorough'] },
		{ text: 'I often enjoy the use of mental pictures to reminisce.', measures: 'usage', tiers: ['standard', 'thorough'], note: 'Verbatim from the IRQ.' },
		{ text: "I use mental images to keep track of everyday things — where I parked, what's left in the fridge.", measures: 'usage', tiers: ['thorough'] }
	],
	[
		// Verbal
		{ text: 'I frequently hold silent, back-and-forth conversations or debates with myself in my head.', measures: 'usage', tiers: ['quick', 'standard', 'thorough'] },
		{ text: 'I think about problems in my mind in the form of a conversation with myself.', measures: 'usage', tiers: ['standard', 'thorough'], note: 'Verbatim from the IRQ.' },
		{ text: "I hear words in my 'mind's ear' when I think.", measures: 'ability', tiers: ['standard', 'thorough'], note: 'Verbatim from the IRQ.' },
		{ text: "I can deliberately 'hear' a sentence in a specific person's voice — accent, tone and all.", measures: 'ability', tiers: ['standard', 'thorough'] },
		{ text: "My inner voice often evaluates and coaches me: 'I should do this,' 'that was a mistake.'", measures: 'usage', tiers: ['thorough'], note: "Adapted from the VISQ's evaluative inner-speech scale." },
		{ text: 'If I am walking somewhere by myself, I often have a silent conversation with myself.', measures: 'usage', tiers: ['thorough'], note: 'Verbatim from the IRQ.' },
		{ text: 'When I hear someone talking, I see words written down in my mind.', measures: 'usage', tiers: ['thorough'], ortho: true, note: 'Verbatim from the IRQ — this measures orthographic imagery, reported separately below.' }
	],
	[
		// Spatial
		{ text: 'I can easily imagine and mentally rotate three-dimensional objects.', measures: 'ability', tiers: ['quick', 'standard', 'thorough'], note: "Adapted from the IRQ's representational-manipulation scale." },
		{ text: 'When I think about places or plans, I automatically see layouts and maps from above.', measures: 'usage', tiers: ['standard', 'thorough'] },
		{ text: 'I can easily visualize how a room would look with the furniture rearranged.', measures: 'ability', tiers: ['standard', 'thorough'] },
		{ text: 'I can judge whether furniture will fit through a doorway just by eye.', measures: 'ability', tiers: ['standard'] },
		{ text: 'My mental images tend to be schematic — arrangements and relationships more than colors and details.', measures: 'usage', tiers: ['thorough'], note: "Adapted from the OSIVQ's spatial-imagery scale." },
		{ text: 'When someone gives me directions, I build a map in my head rather than memorizing the words.', measures: 'usage', tiers: ['thorough'] }
	],
	[
		// Kinesthetic
		{ text: 'It is easy for me to imagine the sensation of licking a brick.', measures: 'ability', tiers: ['quick', 'standard', 'thorough'], note: 'Not a joke — verbatim from a published psychology instrument (the IRQ).' },
		{ text: 'When I imagine a movement — a golf swing, a dance step — I can feel it faintly in my muscles.', measures: 'ability', tiers: ['standard', 'thorough'], note: 'In the style of the MIQ/KVIQ kinesthetic-imagery scales.' },
		{ text: 'I rely on gestures, pacing, or handling objects to think through abstract problems.', measures: 'usage', tiers: ['standard', 'thorough'] },
		{ text: 'Music makes my body want to move almost involuntarily.', measures: 'usage', tiers: ['standard', 'thorough'] },
		{ text: 'I can improve at a physical skill just by mentally rehearsing it.', measures: 'ability', tiers: ['thorough'] },
		{ text: 'I wince or tense up when I see someone else get hurt — I feel it in my own body.', measures: 'usage', tiers: ['thorough'] }
	]
];

// Mini-VVIQ: 5 scenes rated on the real VVIQ 1-5 anchors. Sum (5-25) maps to the
// published 16-80 scale by x3.2, so real population bands apply (Marks 1973; Wright 2024).
export const VVIQ_SCENES = [
	'The face of a friend or relative you see often — the exact contours of their face, head and shoulders.',
	'The sun rising above the horizon into a hazy sky.',
	'The front of a shop you often go to — its window, colors, and signage.',
	'A calm lake surrounded by trees, on a still day.',
	'A rainbow appearing as a storm clears.'
];
export const VVIQ_ANCHORS = [
	"No image at all — I only 'know' I'm thinking of it",
	'Vague and dim',
	'Moderately clear and vivid',
	'Clear and reasonably vivid',
	'Perfectly clear and as vivid as real seeing'
];

export const RHYME_PAIRS = {
	rhyming: [
		['great', 'weight'], ['bury', 'ferry'], ['sword', 'bored'], ['juice', 'moose'], ['eight', 'straight'],
		['colonel', 'kernel'], ['key', 'quay'], ['yacht', 'knot'], ['suite', 'sweet'], ['said', 'bread']
	],
	nonRhyming: [
		['cough', 'dough'], ['pint', 'mint'], ['comb', 'bomb'], ['steak', 'streak'], ['wand', 'band'],
		['gross', 'floss'], ['have', 'cave'], ['done', 'bone'], ['now', 'snow'], ['heard', 'beard']
	]
};

// Mental-rotation shapes. All are chiral and none is 180-degree symmetric
// (checked by hand), so a mirror image can never coincide with a rotation and
// the correct rotation never looks identical to the target.
export interface MRShape {
	name: string;
	hard: boolean;
	cells: [number, number][];
}

export const MR_SHAPES: MRShape[] = [
	{ name: 'F', hard: false, cells: [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]] },
	{ name: 'N', hard: false, cells: [[0, 0], [0, 1], [1, 1], [1, 2], [1, 3]] },
	{ name: 'Y', hard: false, cells: [[1, 0], [0, 1], [1, 1], [1, 2], [1, 3]] },
	{ name: 'P6', hard: true, cells: [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1]] },
	{ name: 'T6', hard: true, cells: [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2], [2, 2]] },
	{ name: 'S6', hard: true, cells: [[0, 0], [0, 1], [0, 2], [1, 2], [1, 3], [2, 3]] }
];

export function shapeSVG(cells: [number, number][], rotation: number, mirrored: boolean, sizePx: number): string {
	const cols = Math.max(...cells.map((c) => c[0])) + 1;
	const rows = Math.max(...cells.map((c) => c[1])) + 1;
	const cell = 64 / Math.max(cols, rows);
	const ox = (100 - cols * cell) / 2;
	const oy = (100 - rows * cell) / 2;
	const rects = cells
		.map(([c, r]) => `<rect x="${ox + c * cell + 1}" y="${oy + r * cell + 1}" width="${cell - 2}" height="${cell - 2}" rx="3" class="shape-fill"/>`)
		.join('');
	const transform = `rotate(${rotation} 50 50)` + (mirrored ? ' translate(100 0) scale(-1 1)' : '');
	return `<svg viewBox="0 0 100 100" width="${sizePx}" height="${sizePx}" aria-hidden="true"><g transform="${transform}">${rects}</g></svg>`;
}

export const PUZZLE_TYPES: PuzzleType[] = ['puzzle-visual', 'puzzle-verbal', 'puzzle-spatial', 'puzzle-kinesthetic'];
export const PUZZLE_TITLES = ['Visual Memory', 'Phonological Loop', 'Mental Rotation', 'Internal Metronome'];

export function buildQuestions(tierName: TierName): Question[] {
	const qs: Question[] = [];
	DIMS.forEach((_d, i) => {
		qs.push({ dim: i, role: 'plane', type: '2d-plane', text: PLANE_QS[i].text, subtext: PLANE_QS[i].subtext });
		if (tierName === 'thorough' && i === 0) {
			qs.push({ dim: 0, role: 'vviq', type: 'vviq', title: 'Imagery Vividness' });
		}
		const items = LIKERT_BANK[i].filter((it) => it.tiers.includes(tierName));
		qs.push({
			dim: i,
			role: 'likert',
			type: 'likert-batch',
			items,
			text: items.length > 1 ? 'How much do you agree with each statement?' : items[0].text
		});
		qs.push({ dim: i, role: 'puzzle', type: PUZZLE_TYPES[i], title: PUZZLE_TITLES[i] });
	});
	return qs;
}
