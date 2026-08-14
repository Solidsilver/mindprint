<script lang="ts">
	// Change detection, single-probe (Luck & Vogel 1997; Xu et al. 2018):
	// colored squares flash briefly; after a blank, one square returns — same
	// color or changed? Capacity K = N × (hit rate − false-alarm rate), averaged
	// over set sizes 4 and 6. Typical adult K ≈ 2.1 (SD 0.8); classic ~3-4.
	// Honesty note: K measures visual working memory, NOT imagery vividness —
	// aphantasics score normally on it. A strategy probe is asked at the end.
	import { onDestroy, untrack } from 'svelte';
	import { shuffle, sample, localDate } from '$lib/quiz/scoring';
	import { normScore, type LabResult } from '$lib/quiz/lab';

	let { onComplete, existing = null }: { onComplete: (r: LabResult) => void; existing?: LabResult | null } = $props();

	const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#92400e'];
	// 12 candidate positions in % of the arena (jittered 4x3 lattice)
	const POSITIONS: [number, number][] = [
		[12, 16], [38, 10], [64, 14], [86, 18],
		[10, 46], [36, 52], [62, 44], [88, 50],
		[14, 80], [40, 84], [66, 78], [86, 84]
	];
	const SHOW_MS = 200, BLANK_MS = 900, N_TRIALS = 36; // 18 per set size, 50% change

	interface Trial {
		n: number;
		positions: number[];
		colors: string[];
		probeIdx: number; // index within positions
		probeColor: string;
		changed: boolean;
	}
	function makeTrial(n: number): Trial {
		const positions = sample([...Array(POSITIONS.length).keys()], n);
		const colors = sample(COLORS, n);
		const probeIdx = Math.floor(Math.random() * n);
		const changed = Math.random() < 0.5;
		const probeColor = changed ? sample(COLORS.filter((c) => !colors.includes(c)), 1)[0] : colors[probeIdx];
		return { n, positions, colors, probeIdx, probeColor, changed };
	}

	const trials: Trial[] = shuffle([
		...Array.from({ length: N_TRIALS / 2 }, () => makeTrial(4)),
		...Array.from({ length: N_TRIALS / 2 }, () => makeTrial(6))
	]);

	let phase = $state<'intro' | 'fixate' | 'show' | 'blank' | 'probe' | 'strategy' | 'done'>(untrack(() => (existing ? 'done' : 'intro')));
	let idx = $state(0);
	let stats = { 4: { hit: 0, changeN: 0, fa: 0, sameN: 0 }, 6: { hit: 0, changeN: 0, fa: 0, sameN: 0 } } as Record<
		number,
		{ hit: number; changeN: number; fa: number; sameN: number }
	>;
	let kValue = $state(0);
	let result = $state<LabResult | null>(untrack(() => existing));
	let timers: ReturnType<typeof setTimeout>[] = [];
	const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));
	onDestroy(() => timers.forEach(clearTimeout));

	const trial = $derived(trials[Math.min(idx, N_TRIALS - 1)]);

	function runTrial() {
		phase = 'fixate';
		later(() => (phase = 'show'), 500);
		later(() => (phase = 'blank'), 500 + SHOW_MS);
		later(() => (phase = 'probe'), 500 + SHOW_MS + BLANK_MS);
	}

	function answer(saidChanged: boolean) {
		const s = stats[trial.n];
		if (trial.changed) {
			s.changeN += 1;
			if (saidChanged) s.hit += 1;
		} else {
			s.sameN += 1;
			if (saidChanged) s.fa += 1;
		}
		idx += 1;
		if (idx >= N_TRIALS) {
			const ks = [4, 6].map((n) => {
				const st = stats[n];
				const h = st.changeN ? st.hit / st.changeN : 0;
				const f = st.sameN ? st.fa / st.sameN : 0;
				return Math.max(0, n * (h - f));
			});
			kValue = Math.round(((ks[0] + ks[1]) / 2) * 10) / 10;
			phase = 'strategy';
		} else {
			runTrial();
		}
	}

	function pickStrategy(s: string) {
		result = {
			id: 'cdk',
			score: normScore(kValue, 2.14, 0.82),
			value: kValue,
			display: `K ≈ ${kValue}`,
			strategy: s,
			d: localDate()
		};
		phase = 'done';
		onComplete(result);
	}
</script>

{#if phase === 'done' && result}
	<div class="text-center p-8 surface-2 rounded-2xl border hairline">
		<div class="t-ink2 font-medium mb-1">Visual Buffer complete.</div>
		<div class="text-3xl font-extrabold t-ink mb-2 tabular-nums">K ≈ {result.value} items</div>
		<p class="text-sm t-ink2 max-w-md mx-auto">
			Typical adult K ≈ 2.1 (SD 0.8); classic lab estimates run 3–4 (Luck &amp; Vogel 1997; Xu et al. 2018). Note: K measures
			working memory, not imagery — people with no mind's eye score normally on this using other strategies.
		</p>
	</div>
{:else if phase === 'intro'}
	<div class="text-center">
		<p class="text-[15px] t-ink2 font-medium mb-6 max-w-md mx-auto">
			Colored squares flash for a <strong class="t-ink">fifth of a second</strong>. After a pause, one square returns — is it
			the <strong class="t-ink">same color or changed</strong>? {N_TRIALS} quick rounds.
		</p>
		<button class="px-8 py-4 btn-primary font-semibold rounded-xl" onclick={runTrial}>Start</button>
	</div>
{:else if phase === 'strategy'}
	<div class="text-center">
		<div class="text-xs font-bold tracking-[0.2em] t-ink3 uppercase mb-3">One last thing</div>
		<p class="text-[15px] t-ink2 font-medium mb-6 max-w-md mx-auto">How did you hold the squares in mind?</p>
		<div class="space-y-2 max-w-sm mx-auto">
			{#each [['pictured', 'I pictured the display'], ['named', 'I named the colors to myself'], ['knew', "I just knew — no picture, no words"], ['mixed', 'A mix / not sure']] as [key, label]}
				<button class="vviq-option w-full rounded-xl px-4 py-3 text-sm font-medium t-ink" onclick={() => pickStrategy(key)}>{label}</button>
			{/each}
		</div>
	</div>
{:else}
	<div class="text-center">
		<div class="text-xs font-bold tracking-[0.2em] t-ink3 uppercase mb-4">Round {idx + 1} of {N_TRIALS}</div>
		<div class="relative w-full max-w-sm mx-auto surface-2 border-2 hairline-2 rounded-2xl" style="aspect-ratio: 4/3;">
			{#if phase === 'fixate' || phase === 'blank'}
				<div class="absolute inset-0 flex items-center justify-center text-2xl t-ink3">+</div>
			{:else if phase === 'show'}
				{#each trial.positions as p, i}
					<div class="absolute w-8 h-8 rounded-md -translate-x-1/2 -translate-y-1/2" style="left: {POSITIONS[p][0]}%; top: {POSITIONS[p][1]}%; background-color: {trial.colors[i]};"></div>
				{/each}
			{:else if phase === 'probe'}
				<div class="absolute w-8 h-8 rounded-md -translate-x-1/2 -translate-y-1/2 ring-2 ring-offset-2" style="left: {POSITIONS[trial.positions[trial.probeIdx]][0]}%; top: {POSITIONS[trial.positions[trial.probeIdx]][1]}%; background-color: {trial.probeColor}; --tw-ring-color: var(--ink-3); --tw-ring-offset-color: var(--card-2);"></div>
			{/if}
		</div>
		<div class="mt-6 flex justify-center gap-4 {phase === 'probe' ? '' : 'invisible'}">
			<button class="px-8 py-4 btn-ghost font-semibold rounded-xl" onclick={() => answer(false)}>Same</button>
			<button class="px-8 py-4 btn-ghost font-semibold rounded-xl" onclick={() => answer(true)}>Changed</button>
		</div>
	</div>
{/if}
