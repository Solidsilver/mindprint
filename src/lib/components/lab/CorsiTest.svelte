<script lang="ts">
	// Corsi block-tapping (Corsi 1972; Kessels et al. 2000): nine irregularly
	// placed blocks light up in sequence at ~1/second; tap them back in order.
	// Adaptive short form; span norm 6.2 (SD 1.3).
	import { onDestroy } from 'svelte';
	import { sample, localDate } from '$lib/quiz/scoring';
	import { normScore, type LabResult } from '$lib/quiz/lab';

	let { onComplete, existing = null }: { onComplete: (r: LabResult) => void; existing?: LabResult | null } = $props();

	// Irregular layout in % of the board (after the classic Milner board's spread)
	const BLOCKS: [number, number][] = [
		[8, 68], [30, 78], [56, 82], [80, 70], [16, 42],
		[44, 52], [72, 40], [30, 16], [62, 10]
	];
	const START = 3, CAP = 9, LIT_MS = 600, GAP_MS = 350;

	let phase = $state<'intro' | 'show' | 'recall' | 'done'>(existing ? 'done' : 'intro');
	let level = $state(START);
	let attempt = $state(1);
	let seq: number[] = [];
	let lit = $state<number | null>(null);
	let taps = $state<number[]>([]);
	let result = $state<LabResult | null>(existing);
	let timers: ReturnType<typeof setTimeout>[] = [];
	const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));
	onDestroy(() => timers.forEach(clearTimeout));

	function genSeq(len: number): number[] {
		// no immediate revisits; sampled path across the board
		const s: number[] = [];
		while (s.length < len) {
			const b = Math.floor(Math.random() * 9);
			if (s.length && s[s.length - 1] === b) continue;
			if (s.length >= 2 && s[s.length - 2] === b) continue;
			s.push(b);
		}
		return s;
	}
	void sample; // (kept import parity with sibling tests)

	function startTrial() {
		seq = genSeq(level);
		taps = [];
		phase = 'show';
		seq.forEach((b, i) => {
			later(() => (lit = b), i * (LIT_MS + GAP_MS));
			later(() => (lit = null), i * (LIT_MS + GAP_MS) + LIT_MS);
		});
		later(() => (phase = 'recall'), seq.length * (LIT_MS + GAP_MS));
	}

	function finish(span: number) {
		result = { id: 'corsi', score: normScore(span, 6.2, 1.3), value: span, display: `span ${span}`, d: localDate() };
		phase = 'done';
		onComplete(result);
	}

	function tap(i: number) {
		if (phase !== 'recall' || taps.length >= level) return;
		lit = i;
		setTimeout(() => (lit = null), 180);
		taps = [...taps, i];
		if (taps.length === level) {
			const correct = taps.every((t, j) => t === seq[j]);
			later(() => {
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
			}, 350);
		}
	}
</script>

{#if phase === 'done' && result}
	<div class="text-center p-8 surface-2 rounded-2xl border hairline">
		<div class="t-ink2 font-medium mb-1">Corsi Blocks complete.</div>
		<div class="text-3xl font-extrabold t-ink mb-2 tabular-nums">Span {result.value}</div>
		<p class="text-sm t-ink2">Adults average 6.2 (SD 1.3) — Corsi 1972; Kessels et al. 2000.</p>
	</div>
{:else if phase === 'intro'}
	<div class="text-center">
		<p class="text-[15px] t-ink2 font-medium mb-6 max-w-md mx-auto">
			Blocks light up <strong class="t-ink">one at a time</strong>. When the sequence stops, tap them back in the same order.
			The sequence grows until you miss twice.
		</p>
		<button class="px-8 py-4 btn-primary font-semibold rounded-xl" onclick={startTrial}>Start</button>
	</div>
{:else}
	<div class="text-center">
		<div class="text-xs font-bold tracking-[0.2em] t-ink3 uppercase mb-4">
			{level} blocks · {phase === 'show' ? 'watch' : `tap them back (${taps.length}/${level})`}{attempt === 2 ? ' · second try' : ''}
		</div>
		<div class="relative w-full max-w-sm mx-auto surface-2 border-2 hairline-2 rounded-2xl" style="aspect-ratio: 4/3;">
			{#each BLOCKS as [x, y], i}
				<button
					class="absolute w-11 h-11 rounded-lg border-2 transition-colors {lit === i ? 'hairline-2' : 'hairline'}"
					style="left: {x}%; top: {y}%; background-color: {lit === i ? 'var(--accent)' : 'var(--card)'};"
					aria-label="block {i + 1}"
					disabled={phase !== 'recall'}
					onclick={() => tap(i)}
				></button>
			{/each}
		</div>
	</div>
{/if}
