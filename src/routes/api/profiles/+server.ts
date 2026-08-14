import { json, error } from '@sveltejs/kit';
import { customAlphabet } from 'nanoid';
import { db, sanitizeProfile } from '$lib/server/db';
import type { RequestHandler } from './$types';

const genCode = customAlphabet('abcdefghjkmnpqrstuvwxyz23456789', 7);

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'invalid JSON');
	}
	const profile = sanitizeProfile(body);
	if (!profile) throw error(400, 'invalid profile');

	const code = genCode();
	db.prepare('INSERT INTO profiles (code, name, data) VALUES (?, ?, ?)').run(code, profile.n, JSON.stringify(profile));
	return json({ code });
};
