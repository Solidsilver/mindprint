import { error } from '@sveltejs/kit';
import { getRoom, roomMembers } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const room = getRoom(params.code);
	if (!room) throw error(404, 'This room does not exist (or the code was mistyped).');
	return { code: room.code, members: roomMembers(room.code) };
};
