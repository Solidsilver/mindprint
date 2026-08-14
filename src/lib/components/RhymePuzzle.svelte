<script lang="ts">
	import { TIER_INFO, RHYME_PAIRS } from '$lib/quiz/questions';
	import { shuffle, sample, chanceCorrect } from '$lib/quiz/scoring';
	import type { Answer, PuzzleAnswer, TierName } from '$lib/quiz/types';

	interface Trial {
		pair: string[];
		answer: boolean;
	}
	interface Props {
		tier: TierName;
		answer?: Answer;
		scratch: { trials?: Trial[]; results?: number[] };
		onAnswer: (a: PuzzleAnswer) => void;
	}
	let { tier, answer = null, scratch, onAnswer }: Props = $props();
	import { untrack } from 'svelte';

	const nTrials = untrack(() => TIER_INFO[tier].rhyme);

	// seed-once: scratch persists across back-navigation remounts (untrack = intentional)
	const { trials, results } = untrack(() => {
		if (!scratch.trials) {
			const nRhyme = Math.ceil(nTrials / 2);
			scratch.trials = shuffle<Trial>([
				...sample(RHYME_PAIRS.rhyming, nRhyme).map((pair) => ({ pair, answer: true })),
				...sample(RHYME_PAIRS.nonRhyming, nTrials - nRhyme).map((pair) => ({ pair, answer: false }))
			]);
			scratch.results = [];
		}
		return { trials: scratch.trials, results: scratch.results ?? (scratch.results = []) };
	});

	let done = $state(untrack(() => Boolean(answer && answer !== 'N/A')));
	let trialIdx = $state(results.length);
	const trial = $derived(trials[Math.min(trialIdx, nTrials - 1)]);

	function pick(val: boolean) {
		results.push(val === trial.answer ? 1 : 0);
		if (results.length === nTrials) {
			const correct = results.reduce((a, b) => a + b, 0);
			onAnswer({ score: chanceCorrect((correct / nTrials) * 100, 0.5), detail: `${correct}/${nTrials}` });
			done = true;
		}
		trialIdx = results.length;
	}

	const doneAns = $derived(answer && typeof answer === 'object' && 'detail' in answer ? answer : null);
</script>

{#if done && doneAns}
	<div class="text-center p-8 surface-2 rounded-2xl border hairline t-ink2 font-medium">
		Rhyme test completed — {doneAns.detail} correct.
	</div>
{:else}
	<div class="text-center">
		<div class="text-xs font-bold tracking-[0.2em] t-ink3 uppercase mb-4">Trial {trialIdx + 1} of {nTrials}</div>
		<p class="text-[15px] t-ink2 font-medium mb-2 max-w-md mx-auto">
			Without saying anything out loud (or moving your lips): do these two words <strong class="t-ink">rhyme</strong>?
		</p>
		<p class="text-xs t-ink3 mb-8">Careful — the spelling is trying to trick you. Trust your inner ear.</p>
		<div class="font-display text-4xl font-semibold t-accent mb-10">{trial.pair[0]} &nbsp;·&nbsp; {trial.pair[1]}</div>
		<div class="flex justify-center gap-4">
			<button class="px-8 py-4 btn-ghost font-semibold rounded-xl" onclick={() => pick(true)}>They rhyme</button>
			<button class="px-8 py-4 btn-ghost font-semibold rounded-xl" onclick={() => pick(false)}>They don't</button>
		</div>
	</div>
{/if}
