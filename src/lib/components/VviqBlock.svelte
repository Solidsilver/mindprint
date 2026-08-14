<script lang="ts">
	import { VVIQ_SCENES, VVIQ_ANCHORS } from '$lib/quiz/questions';
	import type { Answer, VviqAnswer } from '$lib/quiz/types';

	interface Props {
		answer?: Answer;
		scratch: { ratings?: number[] };
		onAnswer: (a: VviqAnswer) => void;
	}
	let { answer = null, scratch, onAnswer }: Props = $props();

	if (!scratch.ratings) scratch.ratings = [];
	const ratings = scratch.ratings;
	let done = $state(Boolean(answer && answer !== 'N/A'));
	let idx = $state(ratings.length);

	function pick(rating: number) {
		ratings.push(rating);
		if (ratings.length === VVIQ_SCENES.length) {
			const sum = ratings.reduce((a, b) => a + b, 0);
			onAnswer({ score: ((sum - 5) / 20) * 100, vviq: Math.round(sum * 3.2), detail: `${sum}/25` });
			done = true;
		}
		idx = ratings.length;
	}

	const vviqAns = $derived(answer && typeof answer === 'object' && 'vviq' in answer ? answer : null);
</script>

{#if done && vviqAns}
	<div class="text-center p-8 surface-2 rounded-2xl border hairline t-ink2 font-medium">
		Imagery block completed — {vviqAns.detail} on the mini-VVIQ (maps to ≈{vviqAns.vviq}/80 on the real scale).
	</div>
{:else}
	<div class="mt-2">
		<div class="text-xs font-bold tracking-[0.2em] t-ink3 uppercase mb-4 text-center">Scene {idx + 1} of {VVIQ_SCENES.length}</div>
		<p class="text-[15px] t-ink2 font-medium mb-2 text-center max-w-md mx-auto">Close your eyes if it helps. Try to picture:</p>
		<p class="font-display text-xl t-ink text-center max-w-md mx-auto mb-6">{VVIQ_SCENES[idx]}</p>
		<p class="text-xs t-ink3 text-center mb-4">How vivid is the image you get? (These are the real VVIQ anchors.)</p>
		<div class="space-y-2 max-w-md mx-auto">
			{#each VVIQ_ANCHORS as anchor, ai}
				<button class="vviq-option w-full rounded-xl px-4 py-3 text-sm font-medium t-ink flex items-center gap-3" onclick={() => pick(ai + 1)}>
					<span class="w-6 h-6 rounded-full border-2 hairline-2 flex items-center justify-center text-xs font-bold t-ink3 shrink-0">{ai + 1}</span>
					<span class="leading-snug">{anchor}</span>
				</button>
			{/each}
		</div>
	</div>
{/if}
