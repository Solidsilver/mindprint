import { browser } from '$app/environment';
import { combineHistory, mergedZ } from './scoring';
import type { Profile, Sitting } from './types';

const HISTORY_KEY = 'csa_history_v3';
const NAME_KEY = 'csa_name';
const ROOM_KEY = 'csa_room';

export function loadHistory(): Sitting[] {
	if (!browser) return [];
	try {
		const saved = localStorage.getItem(HISTORY_KEY);
		if (saved) {
			const h = JSON.parse(saved);
			if (Array.isArray(h)) {
				return h.filter((s): s is Sitting => Boolean(s && Array.isArray(s.a) && s.a.length === 4 && Array.isArray(s.e)));
			}
		}
	} catch {
		/* corrupted storage — start fresh */
	}
	return [];
}

export function saveHistory(history: Sitting[]): void {
	if (!browser) return;
	try {
		localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
	} catch {
		/* full/blocked */
	}
}

export function clearHistoryStorage(): void {
	if (!browser) return;
	try {
		localStorage.removeItem(HISTORY_KEY);
	} catch {
		/* noop */
	}
}

export function getName(): string {
	if (!browser) return '';
	try {
		return localStorage.getItem(NAME_KEY) || '';
	} catch {
		return '';
	}
}
export function setName(name: string): void {
	if (!browser) return;
	try {
		localStorage.setItem(NAME_KEY, name);
	} catch {
		/* noop */
	}
}

export function getRoom(): string {
	if (!browser) return '';
	try {
		return localStorage.getItem(ROOM_KEY) || '';
	} catch {
		return '';
	}
}
export function setRoom(code: string): void {
	if (!browser) return;
	try {
		localStorage.setItem(ROOM_KEY, code);
	} catch {
		/* noop */
	}
}

export function profileFromHistory(history: Sitting[], name?: string): Profile | null {
	if (!history.length) return null;
	const c = combineHistory(history);
	return {
		v: 3,
		n: name || getName() || '',
		a: c.a,
		u: c.u,
		e: c.e,
		z: mergedZ(history),
		h: history.length,
		t: history[history.length - 1].t
	};
}
