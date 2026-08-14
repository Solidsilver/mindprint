// Profile titles, science anchors, population band strips, and the headline finding.
// Anchor numbers come from: VVIQ bands/prevalence (Marks 1973; Zeman 2020; Wright 2024),
// inner-speech sampling (Heavey & Hurlburt 2008; Nedergaard & Lupyan 2024),
// object-spatial dissociation (Blazhenkova & Kozhevnikov 2009; Dawes 2020),
// tapping norms (Repp 2005).

import type { AnchorData, ChannelScores, HeadlineFinding, Strip, TitleDesc, ZSummary } from './types';

/** numeric entry of a ZSummary, or null (entries can also be "x/y" strings) */
const zNum = (v: string | number | null | undefined): number | null => (typeof v === 'number' ? v : null);

export function generateProfile(A: ChannelScores, U: ChannelScores): TitleDesc {
	const getOverall = (dim: string) => (A[dim] + U[dim]) / 2;
	const v = getOverall('Visual');
	const vb = getOverall('Verbal');
	const s = getOverall('Spatial');
	const k = getOverall('Kinesthetic');

	let title = 'Balanced Integrator';
	let desc =
		'Your profile is remarkably balanced: no single mode dominates. You switch fluidly between visual imagery, inner monologue, spatial mapping, and physical intuition depending on the problem at hand.';

	const scores: ChannelScores = { Visual: v, Verbal: vb, Spatial: s, Kinesthetic: k };
	const highs = Object.keys(scores).filter((d) => scores[d] >= 70);
	const sorted = Object.keys(scores).sort((x, y) => scores[y] - scores[x]);

	const pairTitles: Record<string, [string, string]> = {
		'Verbal+Visual': ['The Cinematic Narrator', 'Your mind runs like a movie with a voiceover: vivid imagery accompanied by a strong inner dialogue. Great for storytelling, reading comprehension, and conceptualizing detailed scenarios.'],
		'Spatial+Visual': ['The System Architect', 'You think in 3D blueprints: objects visualized vividly and their relationships mapped in space. A strong profile for engineering, design, and complex logistics.'],
		'Spatial+Verbal': ['The Structural Linguist', 'You process systems and logic through language: abstract structural maps of concepts (like code or org charts) navigated by a strong inner monologue.'],
		'Kinesthetic+Spatial': ['The Mechanical Intuitive', 'You think through the physical world: 3D spatial mapping combined with a strong sense of mechanics and rhythm. Building, navigating, and understanding how physical systems interlock come naturally to you.'],
		'Kinesthetic+Visual': ['The Method Actor', 'You watch and feel scenes at once: vivid imagery fused with felt movement. You rehearse life like a performance — seeing the moment and feeling it in your body simultaneously.'],
		'Kinesthetic+Verbal': ['The Embodied Orator', 'Words and body in lockstep: your inner voice thinks best mid-motion — pacing, gesturing, talking with your hands. Rhythm and rhetoric share one engine.']
	};
	const soloTitles: Record<string, [string, string]> = {
		Visual: ['The Pure Eidetic', 'Your internal world is led by pictures: memories and ideas arrive as clear, vivid images first, with the inner voice and body sense in supporting roles.'],
		Verbal: ['The Concept Narrator', 'You process the world primarily through language and abstract concepts rather than mental pictures. A structured inner monologue drives the show — your mind talks more than it shows.'],
		Spatial: ['The Navigator', 'You lead with layout: maps, arrangements, and relationships in space come first, before pictures or words. Rarely lost, rarely bad at packing a trunk.'],
		Kinesthetic: ['The Proprioceptive Thinker', "You think with your body: the rhythm of a situation, the structure of a mechanical problem, the physical tension of an abstract idea — all felt before they're worded."]
	};

	if (v <= 35 && vb <= 35 && s <= 35 && k <= 35) {
		title = 'Unsymbolized Thinker';
		desc = "Your thought arrives as pure, instantaneous concept — little imagery, words, or sensation on the way to a conclusion. Researchers call this 'unsymbolized thinking,' and it shows up in about a quarter of everyone's sampled moments; some minds live there.";
	} else if (highs.length === 4) {
		title = 'Cognitive Polymath';
		desc = "A highly active multimodal mind: you run detailed visual imagery, a strong inner voice, spatial maps, and physical intuition all at once. Complex, multi-layered problems are your natural habitat.";
	} else if (highs.length === 3) {
		title = 'Tri-Modal Integrator';
		desc = `You're intensely active across three distinct channels (${highs.join(', ')}). Switching readily between them is a big advantage in cross-disciplinary problem solving.`;
	} else if (highs.length === 2) {
		[title, desc] = pairTitles[highs.slice().sort().join('+')];
	} else if (highs.length === 1) {
		[title, desc] = soloTitles[highs[0]];
	} else if (scores[sorted[0]] - scores[sorted[3]] >= 25) {
		[title, desc] = soloTitles[sorted[0]];
	}

	return { title, desc };
}

// The single most notable finding, promoted under the profile title.
export function headlineFinding(A: ChannelScores, U: ChannelScores, z: ZSummary): HeadlineFinding {
	z = z || [];
	const vviq = zNum(z[5]);
	const kinErr = zNum(z[3]);
	const ortho = zNum(z[6]);
	const rotRT = zNum(z[7]);
	if (vviq !== null) {
		if (vviq <= 32) return { dim: 0, text: `Aphantasia-band imagery — bottom ~4% of people` };
		if (vviq >= 75) return { dim: 0, text: `Hyperphantasia-band imagery — top ~6% of people` };
	} else if (A.Visual < 15) {
		return { dim: 0, text: `Aphantasia-zone imagery — ~1–4% of people` };
	} else if (A.Visual > 85) {
		return { dim: 0, text: `Hyperphantasia territory — top ~6% of people` };
	}
	if (kinErr !== null && kinErr <= 30) return { dim: 3, text: `Musician-tight timing — ±${kinErr}ms per beat` };
	if (ortho !== null && ortho >= 75) return { dim: 1, text: `Orthographic imagery — the rarest mode measured` };
	if (U.Verbal >= 90) return { dim: 1, text: `Near-constant inner narrator` };
	if (U.Verbal <= 10 && A.Verbal <= 35) return { dim: 1, text: `A near-silent inner world (anendophasia end)` };
	if (z[2]) {
		const [c, n] = String(z[2]).split('/').map(Number);
		if (n >= 6 && c === n && rotRT !== null && rotRT < 3000) return { dim: 2, text: `Fast, flawless mental rotation` };
	}
	if (A.Visual < 35 && A.Spatial > 65) return { dim: 2, text: `The classic dissociation: dim pictures, sharp mental maps` };
	const dims = ['Visual', 'Verbal', 'Spatial', 'Kinesthetic'];
	const overalls = dims.map((d) => (A[d] + U[d]) / 2);
	const top = overalls.indexOf(Math.max(...overalls));
	return { dim: top, text: `Strongest channel: ${dims[top]}` };
}

// Population band strips: real published bands where they exist, honest
// self-report framing where they don't. Marker = your value, whisker = ±error.
export function buildAnchors(
	A: ChannelScores,
	U: ChannelScores,
	z: ZSummary,
	shared: boolean,
	_skips: boolean[] = [], // kept for call-site symmetry; skip display lives in the component
	eArr: number[] = [13, 13, 13, 13]
): AnchorData {
	z = z || [];
	const you = 'You';
	void shared; // voice is always direct second person now
	const anchors: AnchorData['anchors'] = [];
	const vviq = zNum(z[5]);
	const kinErr = zNum(z[3]);
	const kinSigned = zNum(z[4]);
	const orthoV = zNum(z[6]);
	const rotRT = zNum(z[7]);

	// --- Visual ---
	let vText: string;
	let vStrip: Strip;
	if (vviq !== null) {
		const vv = vviq;
		let band: string;
		if (vv <= 23) band = `deep in the <strong>aphantasia band</strong> (bottom ~1–3% of people)`;
		else if (vv <= 32) band = `in the <strong>dim-imagery band</strong> (bottom ~4% of people)`;
		else if (vv < 75) band = `in the typical range (about 90% of people land here)`;
		else band = `in the <strong>hyperphantasia band</strong> (top ~6%)`;
		vText = `The mini-VVIQ here maps to <strong>≈${vv}/80</strong> on the real published scale — ${band}. Population average is about 58/80.`;
		vStrip = {
			min: 16, max: 80, value: vv, error: Math.round(eArr[0] * 0.64),
			valueLabel: `${vv}`, axisLabel: 'Real VVIQ scale (16–80)',
			marks: [{ at: 58, label: 'avg 58' }],
			segments: [
				{ from: 16, to: 32, label: 'aphantasia ~4%', tone: 'low' },
				{ from: 32, to: 75, label: 'typical ~90%', tone: 'mid' },
				{ from: 75, to: 80, label: 'hyper ~6%', tone: 'high' }
			]
		};
	} else {
		const vCap = A.Visual;
		if (vCap < 15) vText = `${you} landed in the <strong>aphantasia zone</strong> — little to no mind's eye. That's real and surprisingly common: ~1 in 100 people strictly, up to ~1 in 25 loosely. Many never realize others literally <em>see</em> images.`;
		else if (vCap < 35) vText = `Dimmer-than-average imagery. On the standard VVIQ scale the average adult scores about 58/80; the bottom ~4% of people land in this "dim" band.`;
		else if (vCap <= 80) vText = `Typical territory — about 90% of people report moderate-to-strong imagery, and the average adult VVIQ score is ~58/80.`;
		else vText = `<strong>Hyperphantasia territory</strong> — roughly 6% of people report mental images "as vivid as real seeing."`;
		vStrip = {
			min: 0, max: 100, value: vCap, error: eArr[0],
			valueLabel: `${vCap}`, axisLabel: 'Self-reported vividness',
			segments: [
				{ from: 0, to: 15, label: 'aphantasia', tone: 'low' },
				{ from: 15, to: 35, label: 'dim', tone: 'lowmid' },
				{ from: 35, to: 80, label: 'typical ~90%', tone: 'mid' },
				{ from: 80, to: 100, label: 'hyper ~6%', tone: 'high' }
			]
		};
	}
	anchors.push({ dim: 0, text: vText, strip: vStrip });

	// --- Verbal ---
	const vbU = U.Verbal;
	let vbText = `Experience-sampling studies catch people in inner speech in about <strong>23% of random moments</strong> on average — but individuals genuinely range from ~0% to 94%.`;
	if (vbU < 25) vbText += ` A quiet inner world is real and normal — researchers recently named the far end <em>anendophasia</em>.`;
	else if (vbU > 75) vbText += ` You're on the chatty end — some people are in inner speech nearly every waking moment.`;
	anchors.push({
		dim: 1, text: vbText,
		strip: {
			min: 0, max: 100, value: vbU, error: eArr[1],
			valueLabel: `${vbU}`, axisLabel: 'Self-reported inner-speech frequency',
			segments: [
				{ from: 0, to: 15, label: 'near-silent', tone: 'low' },
				{ from: 15, to: 50, label: 'occasional', tone: 'lowmid' },
				{ from: 50, to: 85, label: 'frequent', tone: 'mid' },
				{ from: 85, to: 100, label: 'constant', tone: 'high' }
			]
		}
	});

	// --- Spatial ---
	let sText = `Picture-vividness and spatial reasoning are <strong>separate skills</strong> — they barely correlate, and people with aphantasia usually have fully intact mental rotation. Artists skew object-imagery; engineers and physicists skew spatial.`;
	if (A.Visual < 35 && A.Spatial > 65) sText += ` That exact dissociation shows up right here in this profile.`;
	if (rotRT !== null) sText += ` Median rotation decision here: <strong>${(rotRT / 1000).toFixed(1)}s</strong> per item.`;
	anchors.push({
		dim: 2, text: sText,
		strip: {
			min: 0, max: 100, value: A.Spatial, error: eArr[2],
			valueLabel: `${A.Spatial}`, axisLabel: 'Spatial ability (guessing-corrected)',
			segments: [
				{ from: 0, to: 25, label: 'near chance', tone: 'low' },
				{ from: 25, to: 60, label: 'developing', tone: 'lowmid' },
				{ from: 60, to: 85, label: 'solid', tone: 'mid' },
				{ from: 85, to: 100, label: 'strong', tone: 'high' }
			]
		}
	});

	// --- Kinesthetic ---
	let kText: string;
	let kStrip: Strip | null = null;
	if (kinErr !== null) {
		const err = kinErr, signed = kinSigned;
		kText = `Average metronome drift here was <strong>±${err}ms per beat</strong> at the 1-second tempo. Typical adults drift ~30–60ms; trained musicians manage ~20–30ms.`;
		if (signed !== null && signed < -15) kText += ` And the rushing? Nearly everyone taps 20–80ms <em>early</em> without noticing — it's called negative mean asynchrony.`;
		kStrip = {
			min: 0, max: 150, value: Math.min(err, 150), error: null,
			valueLabel: `±${err}ms`, axisLabel: 'Tap drift per beat (lower is tighter)',
			segments: [
				{ from: 0, to: 30, label: 'musician ~2–3%', tone: 'high' },
				{ from: 30, to: 60, label: 'typical', tone: 'mid' },
				{ from: 60, to: 105, label: 'loose', tone: 'lowmid' },
				{ from: 105, to: 150, label: 'free-jazz', tone: 'low' }
			]
		};
	} else {
		kText = `Felt movement is its own imagery channel — kinesthetic and visual motor imagery load on separate factors in every major instrument (MIQ, KVIQ), and they can dissociate within one person.`;
	}
	anchors.push({ dim: 3, text: kText, strip: kStrip });

	// --- Bonus: orthographic imagery ---
	let ortho: AnchorData['ortho'] = null;
	if (orthoV !== null) {
		const o = orthoV;
		let oText: string;
		if (o >= 75) oText = `You see <strong>written words</strong> while listening to speech — orthographic imagery, the <em>rarest</em> mode in the IRQ's data. A genuinely uncommon inner experience.`;
		else if (o <= 25) oText = `No written words appear in the mind's eye while listening — which is the norm; orthographic imagery is the rarest and most spread-out mode the IRQ measures.`;
		else oText = `Some orthographic imagery — occasionally seeing words written out while hearing them. It's the rarest and most variable mode the IRQ measures.`;
		ortho = { rating: o, text: oText };
	}

	return { anchors, ortho };
}
