<script lang="ts">
	import { untrack } from 'svelte';
	import type { Answer, LikertAnswer, LikertItem } from '$lib/quiz/types';

	interface Props {
		q: { items: LikertItem[] };
		answer?: Answer;
		onAnswer: (a: LikertAnswer) => void;
	}
	let { q, answer = null, onAnswer }: Props = $props();

	const LIKERT_LABELS = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];
	const LIKERT_VALUES = [0, 25, 50, 75, 100];

	// seeded from the answer's initial value; later updates flow the other way (untrack = intentional)
	let values = $state<(number | null)[]>(
		untrack(() =>
			answer && typeof answer === 'object' && 'values' in answer
				? answer.values.slice()
				: new Array(q.items.length).fill(null)
		)
	);

	function pick(i: number, v: number) {
		values[i] = v;
		if (values.every((x) => x !== null)) {
			onAnswer({ values: values.slice() });
		}
	}
</script>

<div class="space-y-6 mt-2">
	<div class="flex justify-between text-[10px] sm:text-xs t-ink3 font-bold uppercase tracking-widest px-1">
		<span>Strongly disagree</span><span>Strongly agree</span>
	</div>
	{#each q.items as item, i}
		<div class="surface-2 border hairline rounded-2xl p-4">
			{#if q.items.length > 1}
				<p class="text-[15px] t-ink font-medium leading-snug mb-3">{item.text}</p>
			{/if}
			<div class="flex justify-between items-center max-w-xs mx-auto">
				{#each LIKERT_VALUES as v, vi}
					<button
						class="dot-radio {values[i] === v ? 'selected' : ''}"
						title={LIKERT_LABELS[vi]}
						aria-label={LIKERT_LABELS[vi]}
						aria-pressed={values[i] === v}
						onclick={() => pick(i, v)}
					></button>
				{/each}
			</div>
			{#if item.note}
				<p class="text-[11px] t-ink3 mt-3 italic text-center">{item.note}</p>
			{/if}
		</div>
	{/each}
</div>
