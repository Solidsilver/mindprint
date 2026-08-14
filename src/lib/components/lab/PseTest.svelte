<script lang="ts">
	// Phonological similarity effect (Conrad & Hull 1964; Baddeley 1966):
	// serial recall of similar-sounding letters (B C D G P T V) vs distinct ones
	// (F H K L R Q). The rhyming set is famously harder — live proof that the
	// inner voice does the remembering. The delta is a demo, not a stable score;
	// the channel contribution uses overall recall of the distinct lists.
	import { onDestroy } from 'svelte';
	import { shuffle, sample, localDate } from '$lib/quiz/scoring';
	import { normScore, type LabResult } from '$lib/quiz/lab';

	let { onComplete, existing = null }: { onComplete: (r: LabResult) => void; existing?: LabResult | null } = $props();

	const SIMILAR = ['B', 'C', 'D', 'G', 'P', 'T', 'V'];
	const DISSIMILAR = ['F', 'H', 'K', 'L', 'R', 'Q'];
	const LIST_LEN = 6, LISTS_PER_COND = 4;

	interface List {
		cond: 'similar' | 'dissimilar';
		letters: string[];
	}
	const lists: List[] = shuffle([
		...Array.from({ length: LISTS_PER_COND }, () => ({ cond: 'similar' as const, letters: sample(SIMILAR, LIST_LEN) })),
		...Array.from({ length: LISTS_PER_COND }, () => ({ cond: 'dissimilar' as const, letters: shuffle(DISSIMILAR) }))
	]);

	let phase = $state<'intro' | 'show' | 'recall' | 'done'>(existing ? 'done' : 'intro');
	let idx = $state(0);
	let shownLetter = $state<string | null>(null);
	let entry = $state('');
	let correct = { similar: 0, dissimilar: 0 };
	let simPct = $state(0);
	let disPct = $state(0);
	let result = $state<LabResult | null>(existing);
	let timers: ReturnType<typeof setTimeout>[] = [];
	const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));
	onDestroy(() => timers.forEach(clearTimeout));

	const list = $derived(lists[Math.min(idx, lists.length - 1)]);

	function startList() {
		entry = '';
		phase = 'show';
		list.letters.forEach((l, i) => {
			later(() => (shownLetter = l), i * 1000);
			later(() => (shownLetter = null), i * 1000 + 700);
		});
		later(() => (phase = 'recall'), list.letters.length * 1000);
	}

	function submit() {
		const typed = entry.toUpperCase().replace(/[^A-Z]/g, '').split('');
		let ok = 0;
		list.letters.forEach((l, i) => {
			if (typed[i] === l) ok += 1;
		});
		correct[list.cond] += ok;
		idx += 1;
		if (idx >= lists.length) {
			const denom = LISTS_PER_COND * LIST_LEN;
			simPct = Math.round((correct.similar / denom) * 100);
			disPct = Math.round((correct.dissimilar / denom) * 100);
			const delta = disPct - simPct;
			result = {
				id: 'pse',
				score: normScore(disPct, 70, 15),
				value: delta,
				value2: disPct,
				display: `Δ ${delta} pts`,
				d: localDate()
			};
			phase = 'done';
			onComplete(result);
		} else {
			startList();
		}
	}
</script>

{#if phase === 'done' && result}
	{@const dis = typeof result.value2 === 'number' ? result.value2 : disPct}
	<div class="text-center p-8 surface-2 rounded-2xl border hairline">
		<div class="t-ink2 font-medium mb-3">Inner Ear Demo complete.</div>
		<div class="flex justify-center gap-8 mb-4">
			<div>
				<div class="text-2xl font-extrabold t-ink tabular-nums">{dis}%</div>
				<div class="text-xs t-ink3 uppercase tracking-wider">distinct letters</div>
			</div>
			<div>
				<div class="text-2xl font-extrabold t-ink tabular-nums">{dis - result.value}%</div>
				<div class="text-xs t-ink3 uppercase tracking-wider">rhyming letters</div>
			</div>
		</div>
		<p class="text-sm t-ink2 max-w-md mx-auto">
			{#if result.value > 5}
				The rhyming set cost you <strong class="t-ink">{result.value} points</strong> — the phonological similarity effect,
				one of the largest effects in memory research. Your inner voice was audibly doing the remembering.
			{:else}
				Barely any penalty from the rhyming letters — either a very sharp inner ear, or you weren't relying on sound to
				remember them at all (people with quiet inner voices often show a reduced effect).
			{/if}
		</p>
	</div>
{:else if phase === 'intro'}
	<div class="text-center">
		<p class="text-[15px] t-ink2 font-medium mb-6 max-w-md mx-auto">
			Letters appear one per second — type them back <strong class="t-ink">in order</strong>. Some lists will feel strangely
			harder than others. That's the experiment.
		</p>
		<button class="px-8 py-4 btn-primary font-semibold rounded-xl" onclick={startList}>Start</button>
	</div>
{:else}
	<div class="text-center">
		<div class="text-xs font-bold tracking-[0.2em] t-ink3 uppercase mb-6">List {idx + 1} of {lists.length}</div>
		{#if phase === 'show'}
			<div class="h-28 flex items-center justify-center">
				<span class="font-display text-7xl font-semibold t-accent">{shownLetter ?? ''}</span>
			</div>
		{:else}
			<p class="text-sm t-ink2 mb-4">Type the {LIST_LEN} letters in order:</p>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				bind:value={entry}
				type="text"
				autocomplete="off"
				autocapitalize="characters"
				autofocus
				class="text-input w-56 px-4 py-3 rounded-xl text-center text-2xl tracking-[0.3em] uppercase"
				onkeydown={(e) => e.key === 'Enter' && entry.replace(/[^a-zA-Z]/g, '').length === LIST_LEN && submit()}
			/>
			<div class="mt-5">
				<button class="px-8 py-3 btn-primary font-semibold rounded-xl" disabled={entry.replace(/[^a-zA-Z]/g, '').length !== LIST_LEN} onclick={submit}>
					Submit
				</button>
			</div>
		{/if}
	</div>
{/if}
