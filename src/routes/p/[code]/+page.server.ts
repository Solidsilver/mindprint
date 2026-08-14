import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { DIMS } from '$lib/quiz/questions';
import { generateProfile } from '$lib/quiz/profile';
import { getCachedNarrativeForProfile } from '$lib/server/narrative';
import type { Profile } from '$lib/quiz/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, url }) => {
	const row = db.prepare('SELECT data FROM profiles WHERE code = ?').get(params.code) as { data: string } | undefined;
	if (!row) throw error(404, 'This Mindprint link does not exist (or was mistyped).');
	const profile = JSON.parse(row.data) as Profile;

	const A = Object.fromEntries(DIMS.map((d, i) => [d.key, profile.a[i]]));
	const U = Object.fromEntries(DIMS.map((d, i) => [d.key, profile.u[i]]));
	const narrative = getCachedNarrativeForProfile(profile);
	const title = narrative ? narrative.title : generateProfile(A, U).title;

	return {
		profile,
		code: params.code,
		ogTitle: `${profile.n ? profile.n + "'s" : 'A'} Mindprint — ${title}`,
		ogImage: `${url.origin}/p/${params.code}/og.png`
	};
};
