<script lang="ts">
	// Visual Patterns Test (Della Sala et al. 1997/1999): a matrix with half its
	// cells filled appears for 3 s; reproduce it. Adaptive short form: pass the
	// first trial of a level to advance; a second trial only on a miss;
	// two misses end the test. Span = highest level passed (norm: ~9, SD 2.2).
	import { onDestroy, untrack } from 'svelte';
	import { sample, localDate } from '$lib/quiz/scoring';
	import { normScore, type LabResult } from '$lib/quiz/lab';

	let { onComplete, existing = null }: { onComplete: (r: LabResult) => void; existing?: LabResult | null } = $props();

	// filled-cell count -> [rows, cols] (cells ≈ 2x filled)
	const DIMS_TABLE: Record<number, [number, number]> = {
		3: [2, 3], 4: [2, 4], 5: [2, 5], 6: [3, 4], 7: [3, 5], 8: [4, 4],
		9: [3, 6], 10: [4, 5], 11: [4, 6], 12: [4, 6], 13: [5, 6]
	};
	const START = 3, CAP = 13, SHOW_MS = 3000;

	let phase = $state<'intro' | 'show' | 'recall' | 'done'>(untrack(() => (existing ? 'done' : 'intro')));
	let level = $state(START);
	let attempt = $state(1); // 1 or 2 at current level
	let grid = $state<{ rows: number; cols: number; filled: Set<number> }>({ rows: 2, cols: 3, filled: new Set() });
	let picked = $state<Set<number>>(new Set());
	let result = $state<LabResult | null>(untrack(() => existing));
	let timer: ReturnType<typeof setTimeout> | undefined;
	onDestroy(() => clearTimeout(timer));

	function makeTrial() {
		const [rows, cols] = DIMS_TABLE[level];
		const cells = rows * cols;
		const filled = new Set(sample([...Array(cells).keys()], level));
		grid = { rows, cols, filled };
		picked = new Set();
	}

	function startTrial() {
		makeTrial();
		phase = 'show';
		timer = setTimeout(() => (phase = 'recall'), SHOW_MS);
	}

	function toggle(i: number) {
		const next = new Set(picked);
		if (next.has(i)) next.delete(i);
		else if (next.size < level) next.add(i);
		picked = next;
	}

	function finish(span: number) {
		result = {
			id: 'vpt',
			score: normScore(span, 9, 2.2),
			value: span,
			display: `span ${span}`,
			d: localDate()
		};
		phase = 'done';
		onComplete(result);
	}

	function submit() {
		const correct = picked.size === grid.filled.size && [...picked].every((i) => grid.filled.has(i));
		if (correct) {
			if (level >= CAP) return finish(CAP);
			level += 1;
			attempt = 1;
			startTrial();
		} else if (attempt === 1) {
			attempt = 2;
			startTrial();
		} else {
			finish(level - 1);
		}
	}
</script>

{#if phase === 'done' && result}
	<div class="text-center p-8 surface-2 rounded-2xl border hairline">
		<div class="t-ink2 font-medium mb-1">Pattern Span complete.</div>
		<div class="text-3xl font-extrabold t-ink mb-2 tabular-nums">Span {result.value}</div>
		<p class="text-sm t-ink2">Adults average ~9 filled cells (SD 2.2) — Visual Patterns Test, Della Sala et al. 1997.</p>
	</div>
{:else if phase === 'intro'}
	<div class="text-center">
		<p class="text-[15px] t-ink2 font-medium mb-6 max-w-md mx-auto">
			A grid will flash for 3 seconds with <strong class="t-ink">half its cells filled</strong>. Memorize the pattern, then
			rebuild it by tapping cells. It grows until you miss twice.
		</p>
		<button class="px-8 py-4 btn-primary font-semibold rounded-xl" onclick={startTrial}>Start</button>
	</div>
{:else}
	<div class="text-center">
		<div class="text-xs font-bold tracking-[0.2em] t-ink3 uppercase mb-4">
			{level} cells · {phase === 'show' ? 'memorize' : 'rebuild it'}{attempt === 2 ? ' · second try' : ''}
		</div>
		<div class="inline-grid gap-1.5 mx-auto" style="grid-template-columns: repeat({grid.cols}, minmax(0, 1fr));">
			{#each Array(grid.rows * grid.cols) as _, i}
				{#if phase === 'show'}
					<div class="w-11 h-11 sm:w-12 sm:h-12 rounded-lg border hairline" style="background-color: {grid.filled.has(i) ? 'var(--ink)' : 'var(--card-2)'};"></div>
				{:else}
					<button
						class="w-11 h-11 sm:w-12 sm:h-12 rounded-lg border transition-colors {picked.has(i) ? 'hairline-2' : 'hairline'}"
						style="background-color: {picked.has(i) ? 'var(--accent)' : 'var(--card-2)'};"
						aria-label="cell {i + 1}"
						aria-pressed={picked.has(i)}
						onclick={() => toggle(i)}
					></button>
				{/if}
			{/each}
		</div>
		{#if phase === 'recall'}
			<div class="mt-6">
				<button class="px-8 py-3 btn-primary font-semibold rounded-xl" disabled={picked.size !== level} onclick={submit}>
					Submit ({picked.size}/{level})
				</button>
			</div>
		{/if}
	</div>
{/if}
