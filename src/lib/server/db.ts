import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { env } from '$env/dynamic/private';
import type { Profile, RoomMember, TierName, ZSummary } from '$lib/quiz/types';

const dataDir = env.DATA_DIR || './data';
mkdirSync(dataDir, { recursive: true });

export const db = new Database(join(dataDir, 'mindprint.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS profiles (
	code TEXT PRIMARY KEY,
	name TEXT NOT NULL DEFAULT '',
	data TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS rooms (
	code TEXT PRIMARY KEY,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS room_members (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	room_code TEXT NOT NULL REFERENCES rooms(code),
	name TEXT NOT NULL,
	data TEXT NOT NULL,
	updated_at TEXT NOT NULL DEFAULT (datetime('now')),
	UNIQUE(room_code, name)
);
CREATE TABLE IF NOT EXISTS narratives (
	sig TEXT NOT NULL,
	tone TEXT NOT NULL,
	data TEXT NOT NULL,
	model TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	PRIMARY KEY (sig, tone)
);
`);

export function getRoom(code: string | undefined): { code: string } | undefined {
	return db.prepare('SELECT code FROM rooms WHERE code = ?').get(String(code || '').toUpperCase()) as
		| { code: string }
		| undefined;
}

export function roomMembers(code: string): RoomMember[] {
	const rows = db
		.prepare('SELECT name, data, updated_at FROM room_members WHERE room_code = ? ORDER BY updated_at ASC')
		.all(String(code || '').toUpperCase()) as { name: string; data: string; updated_at: string }[];
	return rows.map((r) => ({ ...(JSON.parse(r.data) as Profile), n: r.name, updated: r.updated_at }));
}

// Sanitize an incoming profile payload down to exactly what we store.
export function sanitizeProfile(p: unknown): Profile | null {
	if (!p || typeof p !== 'object') return null;
	const raw = p as Record<string, unknown>;
	const num4 = (arr: unknown, lo: number, hi: number): number[] | null =>
		Array.isArray(arr) && arr.length === 4 && arr.every((x) => typeof x === 'number' && isFinite(x))
			? (arr as number[]).map((x) => Math.max(lo, Math.min(hi, Math.round(x))))
			: null;
	const a = num4(raw.a, 0, 100);
	const u = num4(raw.u, 0, 100);
	if (!a || !u) return null;
	const e = num4(raw.e, 1, 30) || [13, 13, 13, 13];
	const z: ZSummary = Array.isArray(raw.z)
		? (raw.z as unknown[]).slice(0, 15).map((v) => {
				if (v === null || v === undefined) return null;
				if (typeof v === 'number' && isFinite(v)) return Math.round(v * 10) / 10;
				if (typeof v === 'string' && /^\d{1,2}\/\d{1,2}$/.test(v)) return v;
				return null;
			})
		: [];
	const tiers: TierName[] = ['quick', 'standard', 'thorough'];
	const t = tiers.includes(raw.t as TierName) ? (raw.t as TierName) : 'quick';
	return {
		v: 3,
		n: String(raw.n || '').slice(0, 24),
		a,
		u,
		e,
		z,
		h: Math.max(1, Math.min(999, parseInt(String(raw.h)) || 1)),
		t
	};
}
