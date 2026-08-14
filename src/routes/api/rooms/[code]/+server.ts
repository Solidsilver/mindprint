import { json, error } from '@sveltejs/kit';
import { db, sanitizeProfile, getRoom, roomMembers } from '$lib/server/db';
import type { RequestHandler } from './$types';

const MAX_MEMBERS = 24;

export const GET: RequestHandler = async ({ params }) => {
	const room = getRoom(params.code);
	if (!room) throw error(404, 'room not found');
	return json({ code: room.code, members: roomMembers(room.code) });
};

export const POST: RequestHandler = async ({ params, request }) => {
	const room = getRoom(params.code);
	if (!room) throw error(404, 'room not found');

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'invalid JSON');
	}
	const profile = sanitizeProfile(body);
	if (!profile || !profile.n) throw error(400, 'invalid profile (a name is required)');

	const count = (
		db.prepare('SELECT COUNT(*) AS c FROM room_members WHERE room_code = ?').get(room.code) as { c: number }
	).c;
	const existing = db.prepare('SELECT id FROM room_members WHERE room_code = ? AND name = ?').get(room.code, profile.n);
	if (!existing && count >= MAX_MEMBERS) throw error(409, 'room is full');

	db.prepare(
		`INSERT INTO room_members (room_code, name, data) VALUES (?, ?, ?)
		 ON CONFLICT(room_code, name) DO UPDATE SET data = excluded.data, updated_at = datetime('now')`
	).run(room.code, profile.n, JSON.stringify(profile));

	return json({ ok: true, code: room.code });
};
