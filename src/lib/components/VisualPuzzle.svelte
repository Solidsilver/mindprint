<script lang="ts">
	import { TIER_INFO } from '$lib/quiz/questions';
	import { shuffle, sample, chanceCorrect } from '$lib/quiz/scoring';
	import { onDestroy, untrack } from 'svelte';
	import type { Answer, PuzzleAnswer, TierName } from '$lib/quiz/types';

	interface Trial {
		size: number;
		grid: string[];
		targetIndex: number;
		targetColor: string;
		opts: string[];
		showMs: number;
	}
	interface Props {
		tier: TierName;
		answer?: Answer;
		scratch: { trials?: Trial[]; results?: number[] };
		onAnswer: (a: PuzzleAnswer) => void;
	}
	let { tier, answer = null, scratch, onAnswer }: Props = $props();

	const VP_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#92400e'];
	const nTrials = untrack(() => TIER_INFO[tier].mem);

	function makeTrial(ti: number): Trial {
		const size = ti >= 3 && tier !== 'quick' ? 4 : 3;
		const cells = size * size;
		let grid: string[];
		if (cells <= VP_COLORS.length) {
			grid = shuffle(VP_COLORS).slice(0, cells);
		} else {
			grid = Array.from({ length: cells }, () => VP_COLORS[Math.floor(Math.random() * VP_COLORS.length)]);
		}
		const targetIndex = Math.floor(Math.random() * cells);
		const targetColor = grid[targetIndex];
		const opts = shuffle([targetColor, ...sample(VP_COLORS.filter((c) => c !== targetColor), 3)]);
		return { size, grid, targetIndex, targetColor, opts, showMs: size === 4 ? 2500 : 2000 };
	}

	// seed-once: scratch persists across back-navigation remounts (untrack = intentional)
	const { trials, results } = untrack(() => {
		if (!scratch.trials) {
			scratch.trials = Array.from({ length: nTrials }, (_, i) => makeTrial(i));
			scratch.results = [];
		}
		return { trials: scratch.trials, results: scratch.results ?? (scratch.results = []) };
	});

	let done = $state(untrack(() => Boolean(answer && answer !== 'N/A')));
	let trialIdx = $state(results.length);
	let phase = $state<'ready' | 'showing' | 'asking'>('ready');
	let timer: ReturnType<typeof setTimeout> | undefined;
	onDestroy(() => clearTimeout(timer));

	const trial = $derived(trials[Math.min(trialIdx, nTrials - 1)]);

	function start() {
		phase = 'showing';
		timer = setTimeout(() => (phase = 'asking'), trial.showMs);
	}

	function pick(color: string) {
		results.push(color === trial.targetColor ? 1 : 0);
		if (results.length === nTrials) {
			const correct = results.reduce((a, b) => a + b, 0);
			onAnswer({ score: chanceCorrect((correct / nTrials) * 100, 0.25), detail: `${correct}/${nTrials}` });
			done = true;
		}
		trialIdx = results.length;
		phase = 'ready';
	}

	const doneAns = $derived(answer && typeof answer === 'object' && 'detail' in answer ? answer : null);
</script>

{#if done && doneAns}
	<div class="text-center p-8 surface-2 rounded-2xl border hairline t-ink2 font-medium">
		Visual memory test completed — {doneAns.detail} correct.
	</div>
{:else}
	<div class="text-center">
		<div class="text-xs font-bold tracking-[0.2em] t-ink3 uppercase mb-4">Trial {trialIdx + 1} of {nTrials}</div>
		{#if phase === 'ready'}
			<p class="text-[15px] t-ink2 font-medium mb-6">
				A grid of colors will flash for {trial.showMs / 1000} seconds. Memorize it — then you'll be asked about one square.
				{#if trial.size === 4}<strong class="t-ink">This one is bigger.</strong>{/if}
			</p>
			<button class="px-6 py-3 btn-primary font-semibold rounded-xl mb-6" onclick={start}>
				{trialIdx === 0 ? 'Start visual test' : `Start trial ${trialIdx + 1}`}
			</button>
		{:else if phase === 'showing'}
			<div class="color-grid g{trial.size}">
				{#each trial.grid as color}
					<div class="color-cell" style="background-color: {color};"></div>
				{/each}
			</div>
		{:else}
			<h3 class="text-lg font-semibold mb-4 t-ink">What color was the highlighted square?</h3>
			<div class="color-grid g{trial.size} mb-6">
				{#each trial.grid as _, i}
					<div
						class="color-cell"
						style={i === trial.targetIndex ? 'border: 3px solid var(--accent); box-shadow: 0 0 0 3px var(--accent-soft);' : ''}
					></div>
				{/each}
			</div>
			<div class="flex flex-wrap justify-center gap-4">
				{#each trial.opts as optColor}
					<button
						class="w-16 h-16 rounded-xl border-4 hairline-2 hover:scale-105 transition-all shadow-sm"
						style="background-color: {optColor};"
						aria-label="color option"
						onclick={() => pick(optColor)}
					></button>
				{/each}
			</div>
		{/if}
	</div>
{/if}
