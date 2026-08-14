import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { renderOgPng } from '$lib/server/og';
import { getCachedNarrativeForProfile } from '$lib/server/narrative';
import type { Profile } from '$lib/quiz/types';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params }) => {
	const row = db.prepare('SELECT data FROM profiles WHERE code = ?').get(params.code) as { data: string } | undefined;
	if (!row) throw error(404, 'not found');
	const profile = JSON.parse(row.data) as Profile;
	const narrative = getCachedNarrativeForProfile(profile);
	const png = renderOgPng(profile, narrative ? narrative.title : null);
	return new Response(new Uint8Array(png), {
		headers: {
			'content-type': 'image/png',
			'cache-control': 'public, max-age=86400'
		}
	});
};
