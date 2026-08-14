// Server-rendered Open Graph card: hand-built SVG (radar polygon computed here)
// rasterized to PNG with resvg. 1200x630, always the light theme for link previews.
import { Resvg } from '@resvg/resvg-js';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { env } from '$env/dynamic/private';
import { generateProfile } from '$lib/quiz/profile';
import type { Profile } from '$lib/quiz/types';

// Fonts live in <project>/fonts; run the service with the project as cwd
// (or set FONT_DIR). resvg only accepts file paths, not buffers, in this version.
const fontDir = env.FONT_DIR || join(process.cwd(), 'fonts');
const fontFiles = [
	'inter-v20-latin-regular.ttf',
	'inter-v20-latin-600.ttf',
	'newsreader-v26-latin-600italic.ttf'
].map((f) => join(fontDir, f)).filter((p) => existsSync(p));

const DIM_KEYS = ['Visual', 'Verbal', 'Spatial', 'Kinesthetic'];
const DIM_COLORS = ['#c23a8c', '#2a78d6', '#0f9d6c', '#d95926'];

function esc(s: unknown): string {
	return String(s).replace(
		/[&<>"']/g,
		(c) => (({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }) as Record<string, string>)[c]
	);
}

// Radar polygon points for a 4-axis chart centered at (cx, cy).
function radarPoints(values: number[], cx: number, cy: number, r: number): string {
	// axes: top, right, bottom, left = Visual, Verbal, Spatial, Kinesthetic
	const angles = [-90, 0, 90, 180].map((deg) => (deg * Math.PI) / 180);
	return values
		.map((v, i) => {
			const rr = (Math.max(0, Math.min(100, v)) / 100) * r;
			return `${(cx + rr * Math.cos(angles[i])).toFixed(1)},${(cy + rr * Math.sin(angles[i])).toFixed(1)}`;
		})
		.join(' ');
}

export function renderOgPng(profile: Profile, titleOverride: string | null = null): Buffer {
	const A = Object.fromEntries(DIM_KEYS.map((k, i) => [k, profile.a[i]]));
	const U = Object.fromEntries(DIM_KEYS.map((k, i) => [k, profile.u[i]]));
	const title = titleOverride || generateProfile(A, U).title;
	const name = profile.n ? `${profile.n.toUpperCase()}'S MINDPRINT` : 'MINDPRINT';

	const cx = 340, cy = 368, R = 168;
	const rings = [0.25, 0.5, 0.75, 1]
		.map((f) => `<circle cx="${cx}" cy="${cy}" r="${R * f}" fill="none" stroke="#e7e7e2" stroke-width="1.5"/>`)
		.join('');
	const axes = [
		`<line x1="${cx}" y1="${cy - R}" x2="${cx}" y2="${cy + R}" stroke="#e7e7e2" stroke-width="1.5"/>`,
		`<line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="#e7e7e2" stroke-width="1.5"/>`
	].join('');
	const labels = [
		`<text x="${cx}" y="${cy - R - 18}" text-anchor="middle" font-family="Inter" font-size="22" font-weight="600" fill="${DIM_COLORS[0]}">Visual</text>`,
		`<text x="${cx + R + 18}" y="${cy + 7}" text-anchor="start" font-family="Inter" font-size="22" font-weight="600" fill="${DIM_COLORS[1]}">Verbal</text>`,
		`<text x="${cx}" y="${cy + R + 38}" text-anchor="middle" font-family="Inter" font-size="22" font-weight="600" fill="${DIM_COLORS[2]}">Spatial</text>`,
		`<text x="${cx - R - 18}" y="${cy + 7}" text-anchor="end" font-family="Inter" font-size="22" font-weight="600" fill="${DIM_COLORS[3]}">Kinesthetic</text>`
	].join('');

	const abilityPts = radarPoints(profile.a, cx, cy, R);
	const usagePts = radarPoints(profile.u, cx, cy, R);

	const chips = DIM_KEYS.map((k, i) => {
		const y = 208 + i * 84;
		const overall = Math.round((profile.a[i] + profile.u[i]) / 2);
		return `
			<rect x="700" y="${y}" width="420" height="64" rx="14" fill="#ffffff" stroke="#e7e7e2"/>
			<circle cx="732" cy="${y + 32}" r="8" fill="${DIM_COLORS[i]}"/>
			<text x="756" y="${y + 41}" font-family="Inter" font-size="26" font-weight="600" fill="#1a1a1e">${k}</text>
			<text x="1096" y="${y + 41}" text-anchor="end" font-family="Inter" font-size="28" font-weight="600" fill="${DIM_COLORS[i]}">${overall}</text>`;
	}).join('');

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
	<rect width="1200" height="630" fill="#f4f4f1"/>
	<text x="600" y="72" text-anchor="middle" font-family="Inter" font-size="24" letter-spacing="6" fill="#8f8f99">${esc(name)}</text>
	<text x="600" y="138" text-anchor="middle" font-family="MindprintSerif" font-style="italic" font-size="58" font-weight="600" fill="#5b4fc4">${esc(title)}</text>
	${rings}${axes}${labels}
	<polygon points="${usagePts}" fill="rgba(217,119,6,0.12)" stroke="#d97706" stroke-width="3.5" stroke-dasharray="9 6"/>
	<polygon points="${abilityPts}" fill="rgba(91,79,196,0.16)" stroke="#5b4fc4" stroke-width="4"/>
	${chips}
	<text x="600" y="600" text-anchor="middle" font-family="Inter" font-size="19" fill="#8f8f99">Mindprint — a field guide to your inner world · for fun, not diagnosis</text>
</svg>`;

	const resvg = new Resvg(svg, {
		fitTo: { mode: 'width', value: 1200 },
		font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Inter' }
	});
	return resvg.render().asPng();
}
