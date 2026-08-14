// LLM-drafted profile narratives (title, description, strengths, blindspots,
// communication) over an OpenAI-compatible endpoint.
//
// Accuracy strategy: the model NEVER sees raw scores. The profile is quantized
// into 0-5 bands per channel plus a small set of notable flags — the "signature".
// Identical signatures get identical narratives (SQLite cache), and the text
// cannot overfit differences smaller than the measurement error. All claims are
// grounded in a fact sheet distilled from the same literature the UI cites.
//
// Env: OPENAI_BASE_URL (default https://api.openai.com/v1), OPENAI_API_KEY
// (required — feature is disabled without it), OPENAI_MODEL (default gpt-4o-mini).

import { env } from '$env/dynamic/private';
import { db } from './db';
import { generateProfile } from '$lib/quiz/profile';
import type { Narrative, NarrativeItem, Profile, Tone } from '$lib/quiz/types';

const DIM_KEYS = ['Visual', 'Verbal', 'Spatial', 'Kinesthetic'];
export const TONES: Tone[] = ['gentle', 'balanced', 'playful'];

interface Band {
	k: string;
	a: number;
	u: number;
}
interface ChatMessage {
	role: 'system' | 'user';
	content: string;
}

// --- Signature banding ---
const band = (s: number): number => Math.max(0, Math.min(5, Math.floor(s / 17)));
const BAND_WORDS = ['very low', 'low', 'mid-low', 'mid-high', 'high', 'very high'];
const zNum = (v: string | number | null | undefined): number | null => (typeof v === 'number' ? v : null);

export function bandProfile(profile: Profile): { sig: string; bands: Band[]; flags: string[] } {
	const bands: Band[] = DIM_KEYS.map((k, i) => ({ k, a: band(profile.a[i]), u: band(profile.u[i]) }));
	const z = profile.z || [];
	const flags: string[] = [];
	const vviq = zNum(z[5]);
	const kinErr = zNum(z[3]);
	const kinSigned = zNum(z[4]);
	const ortho = zNum(z[6]);
	const rotRT = zNum(z[7]);
	if (vviq !== null) {
		if (vviq <= 23) flags.push('vviq-aphantasia-deep');
		else if (vviq <= 32) flags.push('vviq-dim');
		else if (vviq >= 75) flags.push('vviq-hyperphantasia');
	} else if (profile.a[0] < 15) flags.push('self-report-aphantasia-zone');
	else if (profile.a[0] > 85) flags.push('self-report-hyper-zone');
	if (kinErr !== null) {
		if (kinErr <= 30) flags.push('metronome-musician-tight');
		else if (kinErr > 105) flags.push('metronome-loose');
	}
	if (kinSigned !== null) {
		if (kinSigned <= -15) flags.push('rushes-the-beat');
		else if (kinSigned >= 15) flags.push('drags-the-beat');
	}
	if (ortho !== null && ortho >= 75) flags.push('orthographic-imagery-high');
	if (typeof z[2] === 'string') {
		const [c, n] = z[2].split('/').map(Number);
		if (n >= 6 && c === n && rotRT !== null && rotRT < 3000) flags.push('rotation-fast-perfect');
	}
	if (profile.a[0] < 35 && profile.a[2] > 65) flags.push('dissociation-dim-pictures-sharp-maps');
	if (profile.a[2] < 35 && profile.a[0] > 65) flags.push('dissociation-vivid-pictures-weak-maps');
	if (profile.u[1] >= 90) flags.push('inner-speech-near-constant');
	if (profile.u[1] <= 10 && profile.a[1] <= 35) flags.push('inner-speech-near-silent');
	flags.sort();

	const sig = 'n1|' + bands.map((b) => `${b.k[0]}${b.a}${b.u}`).join('.') + '|' + flags.join(',');
	return { sig, bands, flags };
}

// --- Research fact sheet (the model may only claim what this supports) ---
const FACT_SHEET = `
CONSTRUCTS
- Four channels, each with ABILITY (what the mind can do on demand) and USAGE (how often it happens automatically). They are independent: high ability + low usage is a real pattern ("can, but rarely does"), and vice versa is impossible to fake on the objective tests.
- Channels correlate POSITIVELY in real data (IRQ: r=.29-.47). High-on-everything and low-on-everything minds are real. Never frame one channel as necessarily "compensating" for another.

VISUAL (the mind's eye — object imagery)
- Vividness spans a real spectrum: aphantasia (no imagery, ~1-4% of people), a dim band (~4%), typical (~90%, average VVIQ ≈58/80), hyperphantasia ("as vivid as real seeing", ~6%). Many aphantasics discover it late and are stunned others literally see pictures.
- Hyperphantasia upside: rich reminiscence, mental rehearsal, creative scene-building. Its classic friction: assuming everyone else also "sees the movie" when you describe something — and distressing images are vivid too.
- Aphantasia friction: guided imagery, "picture this" instructions, and image-based memory tricks fall flat; upside: less intrusive imagery, memory tends toward facts and meaning.

VERBAL (the inner voice)
- Inner speech occupies ~23% of random waking moments on average, but individuals genuinely range ~0-94% (experience sampling). A near-silent inner world is normal (recently named "anendophasia"); low-inner-speech adults measure a bit lower on verbal working memory and rhyme judgment, nothing else reliable.
- Constant inner speech: thinks by talking (aloud or silently), great rubber-ducker, verbal rehearsal; friction: the evaluative inner voice can loop into self-criticism, and silence from others can be misread as absence of thought.
- Quiet inner world: conclusions arrive without narration; friction: "show your working" and think-aloud requests feel unnatural; others should not read their silence as disengagement.

SPATIAL (the mental map)
- Object imagery and spatial reasoning are SEPARATE, barely-correlated skills; aphantasics usually have fully intact mental rotation. Artists skew object-imagery, engineers/physicists skew spatial (OSIVQ).
- High spatial: thinks in layouts, diagrams, systems; navigates by survey map. Low spatial: prefers routes/lists over maps and diagrams; verbal directions beat floor plans.

KINESTHETIC (the felt body)
- Motor/kinesthetic imagery is its own channel (MIQ/KVIQ); mental rehearsal of movement measurably improves physical skills.
- Tapping norms: typical adults drift ~30-60ms per beat at 1/sec; trained musicians ~20-30ms. Nearly everyone taps 20-80ms EARLY without noticing (negative mean asynchrony) — rushing the beat is human, not a flaw.
- High kinesthetic: thinks while moving, gestures as part of thought, learns by doing; walking meetings help. Low: prefers watching/reading over physical demonstration.

ORTHOGRAPHIC IMAGERY (bonus)
- Seeing written words while listening/thinking is the rarest, most variable mode the IRQ measures. Genuinely uncommon; often useful for spelling and names.

COMMUNICATION FRAMING RULES
- Communication advice is heuristic extrapolation from channel profiles — always frame with "may", "tends to", "often". Never as certainties.
- The single universal blindspot in this domain is the mind-projection error: assuming other people's inner experience matches your own. Tailor its direction to the profile.
- "Learning styles" (teach-to-the-modality) is a debunked prescription. Differences in inner EXPERIENCE are real; never advise "study/teach in your style".
- Never diagnose, never pathologize, never mention clinical conditions. This is a family quiz.
`;

const TONE_INSTRUCTIONS: Record<Tone, string> = {
	gentle: 'Tone: warm and generous. Blindspots should be soft, framed almost as endearing quirks; lead with the upside.',
	balanced: 'Tone: warm but honest. Blindspots name real friction points kindly, each framed with "may" and paired with what to do about it.',
	playful: 'Tone: affectionate roast. Blindspots can tease (family-dinner funny, never mean), strengths can be a little grand. Stay accurate underneath the jokes.'
};

function describeSignature(bands: Band[], flags: string[]): string {
	const lines = bands.map(
		(b) => `- ${b.k}: ability ${BAND_WORDS[b.a]} (${b.a}/5), automatic usage ${BAND_WORDS[b.u]} (${b.u}/5)`
	);
	if (flags.length) lines.push(`- Notable findings: ${flags.join(', ')}`);
	else lines.push('- Notable findings: none — no extreme results');
	return lines.join('\n');
}

function buildMessages(bands: Band[], flags: string[], tone: Tone, fallbackTitle: string): ChatMessage[] {
	const system = `You write short cognitive-style profiles for "Mindprint", a family quiz grounded in real psychology research. You receive banded scores (0-5 per channel; exact numbers are deliberately withheld because they carry measurement error) plus notable findings.

Every claim must be supported by the fact sheet below. ${TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.balanced}

Voice: neutral third person — "this mind", "they". Never "you", never a name.

Respond with ONLY a JSON object, no markdown fences, exactly this shape:
{
  "title": "The <evocative 2-4 word name>",
  "description": "<2-3 sentences capturing how this mind works, from the inside>",
  "strengths": [{"label": "<2-5 words>", "why": "<one sentence>"}, x3],
  "blindspots": [{"label": "<2-5 words>", "why": "<one sentence, framed with 'may'>"}, x2],
  "communication": {
    "style": "<1-2 sentences: how this mind tends to take in and work through ideas>",
    "meet": "<1-2 sentences: how family/colleagues can meet it halfway>"
  }
}

The title should be distinctive and earned by THIS profile's pattern (a rule-based system suggested "${fallbackTitle}" — keep it only if you can't beat it). Make the strengths and blindspots specific to the banded pattern and flags, not generic.

FACT SHEET
${FACT_SHEET}`;

	const user = `Profile signature:\n${describeSignature(bands, flags)}`;
	return [
		{ role: 'system', content: system },
		{ role: 'user', content: user }
	];
}

// --- Output validation: clamp everything the UI will render ---
const clamp = (s: unknown, n: number): string => String(s || '').trim().slice(0, n);

function validateNarrative(obj: unknown): Narrative | null {
	if (!obj || typeof obj !== 'object') return null;
	const raw = obj as Record<string, unknown>;
	const items = (arr: unknown, count: number, labelLen: number, whyLen: number): NarrativeItem[] | null => {
		if (!Array.isArray(arr) || arr.length < 1) return null;
		return (arr as Record<string, unknown>[])
			.slice(0, count)
			.map((it) => ({ label: clamp(it && it.label, labelLen), why: clamp(it && it.why, whyLen) }))
			.filter((it) => it.label && it.why);
	};
	const strengths = items(raw.strengths, 3, 48, 240);
	const blindspots = items(raw.blindspots, 2, 48, 240);
	const title = clamp(raw.title, 44);
	const description = clamp(raw.description, 480);
	const comm = (raw.communication || {}) as Record<string, unknown>;
	const style = clamp(comm.style, 340);
	const meet = clamp(comm.meet, 340);
	if (!title || !description || !strengths || strengths.length < 2 || !blindspots || blindspots.length < 1 || !style || !meet) return null;
	return { title, description, strengths, blindspots, communication: { style, meet } };
}

// --- LLM call ---
async function callLLM(messages: ChatMessage[], withJsonMode: boolean): Promise<{ parsed: unknown; model: string }> {
	const base = (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
	const model = env.OPENAI_MODEL || 'gpt-4o-mini';
	const body: Record<string, unknown> = { model, messages, temperature: 0.8, max_tokens: 900 };
	if (withJsonMode) body.response_format = { type: 'json_object' };
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), 45000);
	try {
		const res = await fetch(base + '/chat/completions', {
			method: 'POST',
			headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
			body: JSON.stringify(body),
			signal: ctrl.signal
		});
		if (!res.ok) {
			// some OpenAI-compatible servers reject response_format — retry plain once
			if (withJsonMode && res.status === 400) return callLLM(messages, false);
			throw new Error(`LLM endpoint ${res.status}`);
		}
		const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
		let text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
		if (!text) throw new Error('empty completion');
		text = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
		const start = text.indexOf('{');
		const end = text.lastIndexOf('}');
		if (start === -1 || end === -1) throw new Error('no JSON in completion');
		return { parsed: JSON.parse(text.slice(start, end + 1)), model };
	} finally {
		clearTimeout(timer);
	}
}

// --- Cache + in-flight dedupe ---
const inFlight = new Map<string, Promise<Narrative | null>>();

export function narrativeEnabled(): boolean {
	return Boolean(env.OPENAI_API_KEY);
}

export function getCachedNarrativeForProfile(profile: Profile): Narrative | null {
	const { sig } = bandProfile(profile);
	for (const tone of TONES) {
		const row = db.prepare('SELECT data FROM narratives WHERE sig = ? AND tone = ?').get(sig, tone) as
			| { data: string }
			| undefined;
		if (row) return JSON.parse(row.data) as Narrative;
	}
	return null;
}

export async function getOrCreateNarrative(profile: Profile, tone: Tone): Promise<Narrative | null> {
	if (!TONES.includes(tone)) tone = 'balanced';
	const { sig, bands, flags } = bandProfile(profile);

	const cached = db.prepare('SELECT data FROM narratives WHERE sig = ? AND tone = ?').get(sig, tone) as
		| { data: string }
		| undefined;
	if (cached) return { ...(JSON.parse(cached.data) as Narrative), cached: true };

	if (!narrativeEnabled()) return null;

	const key = `${sig}::${tone}`;
	const pending = inFlight.get(key);
	if (pending) return pending;

	const work = (async () => {
		const A = Object.fromEntries(DIM_KEYS.map((k, i) => [k, profile.a[i]]));
		const U = Object.fromEntries(DIM_KEYS.map((k, i) => [k, profile.u[i]]));
		const fallbackTitle = generateProfile(A, U).title;
		const { parsed, model } = await callLLM(buildMessages(bands, flags, tone, fallbackTitle), true);
		const narrative = validateNarrative(parsed);
		if (!narrative) throw new Error('LLM output failed validation');
		db.prepare(
			'INSERT INTO narratives (sig, tone, data, model) VALUES (?, ?, ?, ?) ON CONFLICT(sig, tone) DO UPDATE SET data = excluded.data, model = excluded.model'
		).run(sig, tone, JSON.stringify(narrative), model);
		return { ...narrative, cached: false };
	})().finally(() => inFlight.delete(key));

	inFlight.set(key, work);
	return work;
}
