import { json, error } from '@sveltejs/kit';
import { sanitizeProfile } from '$lib/server/db';
import { getOrCreateNarrative, narrativeEnabled, TONES } from '$lib/server/narrative';
import type { Tone } from '$lib/quiz/types';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	let body: { profile?: unknown; tone?: unknown };
	try {
		body = await request.json();
	} catch {
		throw error(400, 'invalid JSON');
	}
	const profile = sanitizeProfile(body.profile);
	if (!profile) throw error(400, 'invalid profile');
	const tone: Tone = TONES.includes(body.tone as Tone) ? (body.tone as Tone) : 'balanced';

	if (!narrativeEnabled()) {
		// no key configured — cached rows (from a previous config) may still exist
		const cached = await getOrCreateNarrative(profile, tone);
		if (cached) return json(cached);
		return json({ disabled: true }, { status: 503 });
	}

	try {
		const narrative = await getOrCreateNarrative(profile, tone);
		return json(narrative);
	} catch (e) {
		console.error('narrative generation failed:', e instanceof Error ? e.message : e);
		throw error(502, 'narrative generation failed');
	}
};
