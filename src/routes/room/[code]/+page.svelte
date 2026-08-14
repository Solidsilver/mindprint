<script lang="ts">
	import CompareRadar from '$lib/components/CompareRadar.svelte';
	import { DIMS } from '$lib/quiz/questions';
	import { generateProfile } from '$lib/quiz/profile';
	import { kinBand } from '$lib/quiz/scoring';
	import { getName } from '$lib/quiz/storage';
	import { showToast } from '$lib/toast.svelte';
	import { onMount } from 'svelte';
	import { Drum, Rotate3d, Camera, Headphones, Sparkles, MessageCircle, Puzzle, Hash, LayoutGrid, Ear, Brain } from '@lucide/svelte';
	import type { RoomMember } from '$lib/quiz/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let members = $state<RoomMember[]>(data.members);
	let selected = $state<string[]>(data.members.slice(0, 4).map((m) => m.n));
	let myName = $state('');

	onMount(() => {
		myName = getName();
		const iv = setInterval(refresh, 30000);
		return () => clearInterval(iv);
	});

	async function refresh() {
		try {
			const res = await fetch(`/api/rooms/${data.code}`);
			if (!res.ok) return;
			const fresh = (await res.json()) as { members: RoomMember[] };
			const hadNames = new Set(members.map((m) => m.n));
			members = fresh.members;
			for (const m of members) {
				if (!hadNames.has(m.n)) {
					showToast(`${m.n} joined the room!`);
					if (selected.length < 4) selected = [...selected, m.n];
				}
			}
		} catch { /* offline — keep what we have */ }
	}

	function toggle(name: string) {
		if (selected.includes(name)) selected = selected.filter((n) => n !== name);
		else if (selected.length < 4) selected = [...selected, name];
		else showToast('Four traces max keeps the chart readable — deselect someone first.', true);
	}

	const people = $derived(members.filter((m) => selected.includes(m.n)));
	const overall = (m: RoomMember, j: number) => Math.round((m.a[j] + m.u[j]) / 2);

	function titleOf(m: RoomMember) {
		const A = Object.fromEntries(DIMS.map((d, i) => [d.key, m.a[i]]));
		const U = Object.fromEntries(DIMS.map((d, i) => [d.key, m.u[i]]));
		return generateProfile(A, U).title;
	}

	const ratio = (d: string | number | null): number | null => {
		if (!d || typeof d !== 'string') return null;
		const [c, n] = d.split('/').map(Number);
		return n ? c / n : null;
	};

	interface Board {
		label: string;
		icon: typeof Drum;
		name: string;
		value: string;
	}
	interface Cand {
		m: RoomMember;
		v: string | number;
		r?: number;
	}
	const leaderboards = $derived.by(() => {
		const boards: Board[] = [];
		const by = (label: string, icon: typeof Drum, candidates: Cand[], fmt: (c: Cand) => string) => {
			if (candidates.length) boards.push({ label, icon, name: candidates[0].m.n, value: fmt(candidates[0]) });
		};
		const withZ = (i: number): Cand[] =>
			members
				.map((m) => ({ m, v: m.z && m.z[i] !== null && m.z[i] !== undefined ? m.z[i] : null }))
				.filter((x): x is Cand => x.v !== null);
		const num = (v: string | number) => (typeof v === 'number' ? v : 0);
		const rtOf = (m: RoomMember) => (typeof m.z?.[7] === 'number' ? (m.z[7] as number) : 1e9);

		by('Tightest metronome', Drum, withZ(3).sort((a, b) => num(a.v) - num(b.v)), (x) => `±${x.v}ms (${kinBand(num(x.v)).label})`);
		by('Sharpest mental rotation', Rotate3d, withZ(2).map((x) => ({ ...x, r: ratio(x.v) })).filter((x): x is Cand & { r: number } => x.r !== null).sort((a, b) => b.r - a.r || rtOf(a.m) - rtOf(b.m)), (x) => `${x.v} correct`);
		by('Best flash memory', Camera, withZ(0).map((x) => ({ ...x, r: ratio(x.v) })).filter((x): x is Cand & { r: number } => x.r !== null).sort((a, b) => b.r - a.r), (x) => `${x.v} correct`);
		by('Finest inner ear', Headphones, withZ(1).map((x) => ({ ...x, r: ratio(x.v) })).filter((x): x is Cand & { r: number } => x.r !== null).sort((a, b) => b.r - a.r), (x) => `${x.v} correct`);
		by("Most vivid mind's eye", Sparkles, withZ(5).sort((a, b) => num(b.v) - num(a.v)), (x) => `≈${x.v}/80 VVIQ`);
		by('Busiest inner voice', MessageCircle, members.map((m) => ({ m, v: m.u[1] })).sort((a, b) => num(b.v) - num(a.v)), (x) => `usage ${x.v}`);
		// Lab records (z slots 8-14)
		by('Longest pattern span', Puzzle, withZ(8).sort((a, b) => num(b.v) - num(a.v)), (x) => `span ${x.v}`);
		by('Deepest digit span', Hash, withZ(9).sort((a, b) => num(b.v) - num(a.v)), (x) => `${x.v} forward`);
		by('Corsi champion', LayoutGrid, withZ(11).sort((a, b) => num(b.v) - num(a.v)), (x) => `span ${x.v}`);
		by('Sharpest ear', Ear, withZ(12).sort((a, b) => num(a.v) - num(b.v)), (x) => `±${x.v}% of the beat`);
		by('Biggest visual buffer', Brain, withZ(13).sort((a, b) => num(b.v) - num(a.v)), (x) => `K ≈ ${x.v}`);
		return boards;
	});
</script>

<svelte:head>
	<title>Family room {data.code} — Mindprint</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="p-8 sm:p-12">
	<div class="text-center mb-6">
		<h2 class="text-xs font-bold tracking-[0.2em] t-ink3 uppercase mb-3">Family room · code {data.code}</h2>
		<h3 class="font-display text-3xl font-semibold t-ink">Mindprints, side by side</h3>
		<p class="text-xs t-ink3 mt-2">Anyone can join from their results screen with the code <strong class="t-ink2">{data.code}</strong>. Updates live.</p>
	</div>

	{#if members.length === 0}
		<div class="text-center p-10 surface-2 rounded-2xl border hairline t-ink2">
			Nobody here yet. <a href="/" class="t-accent font-bold underline">Take the inventory</a>, then post your result with room code <strong>{data.code}</strong>.
		</div>
	{:else}
		<div class="flex flex-wrap gap-2 mb-6 justify-center">
			{#each members as m}
				{@const i = selected.indexOf(m.n)}
				<button
					class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors {i >= 0 ? 'hairline-2' : 'hairline opacity-60'}"
					style="background-color: var(--card-2);"
					onclick={() => toggle(m.n)}
					title={i >= 0 ? 'Click to hide from chart' : 'Click to show on chart'}
				>
					<span class="w-2.5 h-2.5 rounded-full" style="background-color: {i >= 0 ? `var(--p-${i})` : 'var(--line-2)'}"></span>
					{m.n}{m.n === myName ? ' (you)' : ''}{m.h > 1 ? ` ×${m.h}` : ''}
				</button>
			{/each}
		</div>

		<CompareRadar {people} />

		<div class="overflow-x-auto mt-6 mb-10">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b hairline-2">
						<th class="text-left py-2 pr-2 sm:pr-3 t-ink3 text-xs font-bold uppercase tracking-widest">Member</th>
						<th class="text-left py-2 px-3 t-ink3 text-xs font-bold uppercase tracking-widest hidden sm:table-cell">Profile</th>
						{#each DIMS as d, i}
							<th class="text-right py-2 px-1.5 sm:px-2 text-xs font-bold" style="color: var(--dim-{i})">{d.key.slice(0, 3)}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each members as m}
						<tr class="border-b hairline {m.n === myName ? 'font-semibold' : ''}">
							<td class="py-2.5 pr-2 sm:pr-3 t-ink">
								{m.n}
								<span class="block sm:hidden font-display text-xs t-ink2 font-normal">{titleOf(m)}</span>
							</td>
							<td class="py-2.5 px-3 t-ink2 font-display hidden sm:table-cell">{titleOf(m)}</td>
							{#each DIMS as d, j}
								<td class="text-right py-2.5 px-1.5 sm:px-2 tabular-nums t-ink">{overall(m, j)}</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if members.length >= 2}
			<h4 class="text-xs font-bold tracking-[0.2em] t-ink3 uppercase mb-4 text-center">Where everyone lands</h4>
			<div class="space-y-5 mb-10">
				{#each DIMS as d, j}
					<div>
						<div class="flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-1.5" style="color: var(--dim-{j})">
							{@html d.glyph}<span>{d.key}</span>
						</div>
						<div class="relative h-8 rounded-lg border hairline" style="background-color: var(--card-2);">
							<div class="absolute inset-y-0 left-1/2 w-px" style="background-color: var(--line-2);"></div>
							{#each members as m}
								<div
									class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 {m.n === myName ? 'w-4 h-4 z-10' : 'w-3 h-3'}"
									style="left: {overall(m, j)}%; background-color: var(--dim-{j}); border-color: var(--card); opacity: {m.n === myName ? 1 : 0.65};"
									title="{m.n}: {overall(m, j)}"
								></div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
			<p class="text-xs t-ink3 text-center -mt-6 mb-10">Overall score per channel, 0–100. The big dot is you; hover any dot for the name.</p>
		{/if}

		{#if leaderboards.length}
			<h4 class="text-xs font-bold tracking-[0.2em] t-ink3 uppercase mb-4 text-center">Family records</h4>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
				{#each leaderboards as b}
					<div class="surface-2 border hairline rounded-2xl p-4 flex items-center gap-3">
						<div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style="background-color: var(--accent-soft); color: var(--accent);">
							<b.icon size={20} strokeWidth={2} />
						</div>
						<div class="min-w-0">
							<div class="text-xs font-bold uppercase tracking-widest t-ink3">{b.label}</div>
							<div class="text-sm t-ink"><strong>{b.name}</strong> · <span class="tabular-nums t-ink2">{b.value}</span></div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}

	<div class="flex flex-col sm:flex-row gap-3">
		<a href="/" class="flex-1 px-6 py-4 btn-primary font-semibold rounded-xl text-center">Take the inventory</a>
		<button onclick={refresh} class="flex-1 px-6 py-4 btn-ghost font-semibold rounded-xl">Refresh now</button>
	</div>
</div>
