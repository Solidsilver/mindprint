<script lang="ts">
	import { DIMS, TIER_INFO } from '$lib/quiz/questions';
	import { generateProfile, buildAnchors, headlineFinding } from '$lib/quiz/profile';
	import { LAB_TESTS, labValueFromZ } from '$lib/quiz/lab';
	import { kinBand } from '$lib/quiz/scoring';
	import { browser } from '$app/environment';
	import Radar from './Radar.svelte';
	import BandStrip from './BandStrip.svelte';
	import { Sparkles } from '@lucide/svelte';
	import type { Narrative, Profile, Sitting, Tone } from '$lib/quiz/types';
	import type { Snippet } from 'svelte';

	interface Props {
		profile: Profile;
		viewingShared?: boolean;
		skips?: boolean[];
		history?: Sitting[];
		onClearHistory?: (() => void) | null;
		children?: Snippet;
	}
	let { profile, viewingShared = false, skips = [], history = [], onClearHistory = null, children }: Props = $props();

	// --- LLM narrative: generated on request, cached per banded signature; tone is a segmented control ---
	const TONES: Tone[] = ['gentle', 'balanced', 'playful'];
	const TONE_BLURBS: Record<Tone, string> = {
		gentle: 'Warm and generous — blindspots framed softly, leading with the upside.',
		balanced: 'Honest but kind — real friction points, each paired with what to do about them.',
		playful: 'An affectionate roast — teasing where it’s true, accurate underneath the jokes.'
	};
	let tone = $state<Tone>('balanced');
	// drafts kept per tone, so sliding back to a generated take is instant
	let drafts = $state<Partial<Record<Tone, Narrative>>>({});
	let loadingTone = $state<Tone | null>(null);
	let toneErrors = $state<Partial<Record<Tone, string>>>({});
	let narrativesOff = $state(false);

	if (browser) {
		try {
			const saved = localStorage.getItem('csa_tone') as Tone | null;
			if (saved && TONES.includes(saved)) tone = saved;
		} catch { /* noop */ }
	}

	const narrative = $derived(drafts[tone] ?? null);

	function pickTone(t: Tone) {
		tone = t;
		try { localStorage.setItem('csa_tone', t); } catch { /* noop */ }
	}

	async function generate() {
		if (loadingTone) return;
		const t = tone;
		loadingTone = t;
		toneErrors = { ...toneErrors, [t]: undefined };
		try {
			const snapshot = JSON.parse(
				JSON.stringify({ a: profile.a, u: profile.u, e: profile.e, z: profile.z, h: profile.h, t: profile.t, n: '' })
			);
			const res = await fetch('/api/narrative', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ profile: snapshot, tone: t })
			});
			if (res.status === 503) {
				narrativesOff = true;
				return;
			}
			if (!res.ok) {
				const body = (await res.json().catch(() => null)) as { message?: string } | null;
				toneErrors = { ...toneErrors, [t]: body?.message || `generation failed (${res.status})` };
				return;
			}
			drafts = { ...drafts, [t]: (await res.json()) as Narrative };
		} catch {
			toneErrors = { ...toneErrors, [t]: 'network error — is the server reachable?' };
		} finally {
			loadingTone = null;
		}
	}

	// a different profile (retake, other share link) invalidates the drafted narratives
	const profileKey = $derived(JSON.stringify([profile.a, profile.u]));
	$effect(() => {
		void profileKey;
		drafts = {};
		toneErrors = {};
		loadingTone = null;
	});

	const A = $derived(Object.fromEntries(DIMS.map((d, i) => [d.key, profile.a[i]])));
	const U = $derived(Object.fromEntries(DIMS.map((d, i) => [d.key, profile.u[i]])));
	const eArr = $derived(profile.e || [13, 13, 13, 13]);
	const z = $derived(profile.z || []);
	const titleDesc = $derived(generateProfile(A, U));
	const headline = $derived(headlineFinding(A, U, z));
	const anchorData = $derived(buildAnchors(A, U, z, viewingShared, skips, eArr));
	const avgE = $derived(Math.round(eArr.reduce((x, y) => x + y, 0) / 4));

	const metaLine = $derived.by(() => {
		const bits = [];
		if (profile.h > 1) bits.push(`averaged across ${profile.h} sittings`);
		else if (profile.t && TIER_INFO[profile.t]) bits.push(`${TIER_INFO[profile.t].label} sitting`);
		bits.push(`typical error ±${avgE} per channel`);
		return bits.join(' · ');
	});

	interface ObjStatus {
		text: string;
		cls: string;
	}
	interface ObjRow {
		dim: number;
		label: string;
		status: ObjStatus | null;
		extra?: string | null;
	}
	function fmtTrials(d: string | number | null | undefined): ObjStatus | null {
		if (d === null || d === undefined || d === '') return null;
		if (typeof d === 'number') d = `${d}/2`; // legacy v2 links stored the count only
		const [c, n] = String(d).split('/').map(Number);
		const ratio = n ? c / n : 0;
		const cls = ratio >= 0.8 ? 'good' : ratio >= 0.5 ? 'warn' : 'bad';
		return { text: `${d} correct`, cls };
	}

	const objRows = $derived.by(() => {
		const rows: ObjRow[] = [];
		rows.push({ dim: 0, label: 'Visual memory (flash grid)', status: fmtTrials(z[0]) });
		rows.push({ dim: 1, label: 'Phonological loop (rhyme test)', status: fmtTrials(z[1]) });
		const rotRT = typeof z[7] === 'number' ? z[7] : null;
		rows.push({ dim: 2, label: 'Mental rotation' + (rotRT ? ' + speed' : ''), status: fmtTrials(z[2]), extra: rotRT ? `med ${(rotRT / 1000).toFixed(1)}s` : null });
		const kinErr = typeof z[3] === 'number' ? z[3] : null;
		const kin = kinErr !== null ? { text: `±${kinErr}ms (${kinBand(kinErr).label})`, cls: kinBand(kinErr).cls } : null;
		rows.push({ dim: 3, label: 'Internal metronome', status: kin });
		return rows;
	});

	const labRows = $derived(
		LAB_TESTS.map((t) => ({ meta: t, value: labValueFromZ(z, t.id) })).filter((r) => r.value !== null)
	);
</script>

<div class="text-center mb-6">
	<h2 class="text-xs font-bold tracking-[0.2em] t-ink3 uppercase mb-3">
		{viewingShared ? `${profile.n || 'Someone'}'s Mindprint` : 'Your Mindprint'}
	</h2>
	<h3 id="profile-title" class="font-display text-4xl font-semibold t-accent">{narrative?.title || titleDesc.title}</h3>
	<p class="text-xs t-ink3 mt-3 font-semibold tabular-nums">{metaLine}</p>
	{#if headline}
		<div class="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border hairline"
			style="color: var(--dim-{headline.dim}); background-color: color-mix(in srgb, var(--dim-{headline.dim}) 8%, transparent);">
			{@html DIMS[headline.dim].glyph}
			<span>{headline.text}</span>
		</div>
	{/if}
</div>

<Radar ability={profile.a} usage={profile.u} error={eArr} />
<p class="text-xs t-ink3 text-center mt-2 mb-8 leading-relaxed max-w-md mx-auto">
	<strong class="t-ink2">Ability</strong> = what your mind <em>can</em> do on demand; <strong class="t-ink2">Usage</strong> = how often it happens automatically.
	The shaded band is measurement uncertainty — differences inside it don't mean much.
</p>

<div class="surface-2 p-6 rounded-2xl mb-8 border hairline">
	<p id="profile-desc" class="t-ink2 text-[15px] leading-relaxed">{narrative?.description || titleDesc.desc}</p>
</div>

{#if !narrativesOff}
	<div class="surface p-6 rounded-2xl mb-8 border hairline">
		<div class="flex items-center justify-between mb-5 gap-3 flex-wrap">
			<h4 class="text-xs font-bold tracking-[0.2em] t-ink3 uppercase">Strengths &amp; blindspots</h4>
			<div class="seg" role="tablist" aria-label="Narrative tone">
				<div class="seg-thumb" style="transform: translateX({TONES.indexOf(tone) * 100}%);"></div>
				{#each TONES as t}
					<button
						role="tab"
						aria-selected={tone === t}
						class="seg-btn"
						style="color: {tone === t ? 'var(--accent)' : 'var(--ink-3)'};"
						onclick={() => pickTone(t)}
					>{t}</button>
				{/each}
			</div>
		</div>

		{#if loadingTone === tone}
			<div class="py-2" aria-live="polite">
				<p class="text-xs t-ink3 mb-4 inline-flex items-center gap-1.5 animate-pulse">
					<Sparkles size={13} /> Drafting the {tone} take…
				</p>
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					{#each [0, 1] as col (col)}
						<div class="space-y-3 animate-pulse">
							<div class="h-3 rounded w-24" style="background-color: var(--line);"></div>
							<div class="h-3 rounded w-full" style="background-color: var(--line);"></div>
							<div class="h-3 rounded w-5/6" style="background-color: var(--line);"></div>
							<div class="h-3 rounded w-4/6" style="background-color: var(--line);"></div>
						</div>
					{/each}
				</div>
			</div>
		{:else if narrative}
			<div class="fade-enter">
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
					<div>
						<div class="text-xs font-bold uppercase tracking-widest mb-2" style="color: var(--good);">Strengths</div>
						<div class="space-y-3">
							{#each narrative.strengths as s}
								<div class="text-sm">
									<span class="font-semibold t-ink">{s.label}</span>
									<span class="t-ink2"> — {s.why}</span>
								</div>
							{/each}
						</div>
					</div>
					<div>
						<div class="text-xs font-bold uppercase tracking-widest mb-2" style="color: var(--warn);">Blindspots</div>
						<div class="space-y-3">
							{#each narrative.blindspots as b}
								<div class="text-sm">
									<span class="font-semibold t-ink">{b.label}</span>
									<span class="t-ink2"> — {b.why}</span>
								</div>
							{/each}
						</div>
					</div>
				</div>
				<div class="surface-2 rounded-xl p-4 border hairline">
					<div class="text-xs font-bold uppercase tracking-widest t-ink3 mb-2">Working with your mind</div>
					<p class="text-sm t-ink2 leading-relaxed mb-2">{narrative.communication.style}</p>
					<p class="text-sm t-ink2 leading-relaxed"><strong class="t-ink">How others can meet you halfway:</strong> {narrative.communication.meet}</p>
				</div>
				<p class="text-[11px] t-ink3 mt-4 text-center">
					Drafted by a language model from banded scores only (exact numbers withheld — they carry measurement error), grounded in the research below, and cached so identical profiles read identically.
				</p>
			</div>
		{:else}
			<div class="text-center py-4">
				<p class="text-sm t-ink2 mb-1 max-w-md mx-auto">
					<strong class="t-ink capitalize">{tone}</strong> — {TONE_BLURBS[tone]}
				</p>
				<p class="text-xs t-ink3 mb-4 max-w-md mx-auto">
					An AI-drafted read of your profile, grounded in the research below.
				</p>
				{#if toneErrors[tone]}
					<p class="text-xs mb-3" style="color: var(--bad);">{toneErrors[tone]}</p>
				{/if}
				<button
					onclick={generate}
					disabled={loadingTone !== null}
					class="px-6 py-3 btn-primary font-semibold rounded-xl text-sm inline-flex items-center gap-2"
				>
					<Sparkles size={15} /> {toneErrors[tone] ? 'Try again' : 'Generate strengths & blindspots'}
				</button>
			</div>
		{/if}
	</div>
{/if}

<div class="space-y-3 mb-8">
	{#each anchorData.anchors as an}
		<div class="anchor-card surface-2 rounded-r-xl p-4 pl-5 border hairline" style="border-left-color: var(--dim-{an.dim});">
			<div class="flex items-center gap-2 mb-1 text-xs font-bold uppercase tracking-widest" style="color: var(--dim-{an.dim});">
				{@html DIMS[an.dim].glyph}<span>{DIMS[an.dim].key}</span>
				<span class="ml-auto t-ink3 font-semibold normal-case tracking-normal tabular-nums">
					{#if skips[an.dim]}skipped{:else}ability {A[DIMS[an.dim].key]} · usage {U[DIMS[an.dim].key]} <span class="opacity-70">±{eArr[an.dim]}</span>{/if}
				</span>
			</div>
			<p class="text-[13px] t-ink2 leading-relaxed">{@html an.text}</p>
			{#if an.strip && !skips[an.dim]}
				<BandStrip strip={an.strip} color="var(--dim-{an.dim})" />
			{/if}
		</div>
	{/each}
	{#if anchorData.ortho}
		<div class="anchor-card surface-2 rounded-r-xl p-4 pl-5 border hairline" style="border-left-color: var(--accent);">
			<div class="flex items-center gap-2 mb-1 text-xs font-bold uppercase tracking-widest" style="color: var(--accent);">
				<span>Bonus · Orthographic imagery</span>
				<span class="ml-auto t-ink3 font-semibold normal-case tracking-normal tabular-nums">rating {anchorData.ortho.rating}</span>
			</div>
			<p class="text-[13px] t-ink2 leading-relaxed">{@html anchorData.ortho.text}</p>
		</div>
	{/if}
</div>

<div class="surface p-6 rounded-2xl mb-8 border hairline">
	<h4 class="text-xs font-bold tracking-[0.2em] t-ink3 uppercase mb-4 text-center">Objective test performance</h4>
	<div class="space-y-3">
		{#each objRows as row, idx}
			<div class="flex justify-between items-center text-sm {idx < 3 ? 'border-b hairline pb-2' : ''} {idx > 0 ? 'pt-1' : ''}">
				<span class="t-ink2 font-medium flex items-center gap-2">
					<span style="color: var(--dim-{row.dim})">{@html DIMS[row.dim].glyph}</span>{row.label}
				</span>
				<span>
					{#if row.status}
						<span class="font-semibold tabular-nums" style="color: var(--{row.status.cls})">{row.status.text}</span>
						{#if row.extra}<span class="t-ink3 text-xs tabular-nums"> {row.extra}</span>{/if}
					{:else}<span class="t-ink3">Skipped</span>{/if}
				</span>
			</div>
		{/each}
	</div>
	<p class="text-[11px] t-ink3 mt-4 text-center">
		Raw counts shown; channel scores use guessing-corrected accuracy (getting half right on a yes/no test is chance, not skill).
	</p>
</div>

{#if labRows.length}
	<div class="surface p-6 rounded-2xl mb-8 border hairline">
		<h4 class="text-xs font-bold tracking-[0.2em] t-ink3 uppercase mb-4 text-center">Lab results</h4>
		<div class="space-y-3">
			{#each labRows as row, idx}
				<div class="text-sm {idx < labRows.length - 1 ? 'border-b hairline pb-3' : ''}">
					<div class="flex justify-between items-center gap-3">
						<span class="t-ink2 font-medium flex items-center gap-2">
							<span style="color: var(--dim-{row.meta.dim})">{@html DIMS[row.meta.dim].glyph}</span>{row.meta.name}
						</span>
						<span class="font-semibold tabular-nums t-accent whitespace-nowrap">{row.value}</span>
					</div>
					<p class="text-[11px] t-ink3 mt-1">{row.meta.norm} <span class="italic">({row.meta.citation})</span></p>
				</div>
			{/each}
		</div>
	</div>
{/if}

{#if !viewingShared && history.length >= 2}
	<div class="surface p-6 rounded-2xl mb-8 border hairline">
		<h4 class="text-xs font-bold tracking-[0.2em] t-ink3 uppercase mb-4 text-center">Your sittings</h4>
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b hairline-2">
						<th class="text-left py-2 pr-2 t-ink3 text-xs font-bold uppercase tracking-widest">Date</th>
						<th class="text-left py-2 px-2 t-ink3 text-xs font-bold uppercase tracking-widest">Depth</th>
						{#each DIMS as d, i}
							<th class="text-right py-2 px-2 text-xs font-bold" style="color: var(--dim-{i})">{d.key.slice(0, 3)}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each history as s}
						<tr class="border-b hairline">
							<td class="py-2 pr-2 t-ink2 tabular-nums">{s.d}</td>
							<td class="py-2 px-2 t-ink2">{TIER_INFO[s.t] ? TIER_INFO[s.t].label : s.t}</td>
							{#each s.a as av, j}
								<td class="text-right py-2 px-2 tabular-nums t-ink">{Math.round((av + s.u[j]) / 2)}</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="text-xs t-ink3 pt-3">Overall score per channel, per sitting. Every retake tightens the averaged profile above.</p>
		{#if onClearHistory}
			<div class="text-center mt-3">
				<button onclick={onClearHistory} class="text-xs t-ink3 hover:t-ink2 underline">Clear history</button>
			</div>
		{/if}
	</div>
{/if}

{@render children?.()}

<p class="text-xs t-ink3 mt-8 leading-relaxed text-center">
	For fun, not diagnosis. Score anchors come from real research — VVIQ imagery bands (Marks 1973; Zeman 2020; Wright 2024),
	inner-speech sampling (Heavey &amp; Hurlburt 2008), object–spatial dissociation (Blazhenkova &amp; Kozhevnikov 2009; Dawes 2020),
	and tapping norms (Repp 2005). And no, this isn't “learning styles” — matching teaching to a preferred modality is a myth
	(Pashler 2008); differences in inner <em>experience</em> are real.
</p>
