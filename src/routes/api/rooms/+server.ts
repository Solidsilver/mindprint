import { json } from '@sveltejs/kit';
import { customAlphabet } from 'nanoid';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

const genCode = customAlphabet('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 6);

export const POST: RequestHandler = async () => {
	const code = genCode();
	db.prepare('INSERT INTO rooms (code) VALUES (?)').run(code);
	return json({ code });
};
