<script lang="ts">
	// Digit span, WAIS tradition: digits at 1/second, repeat them back; forward
	// block then backward block. Adaptive short form (pass advances immediately,
	// two misses at a length end the block). Norms: forward ~6.5, backward ~4.8.
	import { onDestroy } from 'svelte';
	import { localDate } from '$lib/quiz/scoring';
	import { normScore, type LabResult } from '$lib/quiz/lab';

	let { onComplete, existing = null }: { onComplete: (r: LabResult) => void; existing?: LabResult | null } = $props();

	const START = 3, CAP = 9;

	let phase = $state<'intro' | 'show' | 'recall' | 'between' | 'done'>(existing ? 'done' : 'intro');
	let block = $state<'forward' | 'backward'>('forward');
	let level = $state(START);
	let attempt = $state(1);
	let seq: number[] = [];
	let shownDigit = $state<number | null>(null);
	let entry = $state('');
	let spans = $state<{ forward: number; backward: number }>({ forward: 0, backward: 0 });
	let result = $state<LabResult | null>(existing);
	let timers: ReturnType<typeof setTimeout>[] = [];
	const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));
	onDestroy(() => timers.forEach(clearTimeout));

	function genSeq(len: number): number[] {
		const s: number[] = [];
		while (s.length < len) {
			const d = 1 + Math.floor(Math.random() * 9);
			if (s.length && s[s.length - 1] === d) continue; // no immediate repeats
			if (s.length >= 2) {
				const a = s[s.length - 2], b = s[s.length - 1];
				if (b - a === d - b && Math.abs(d - b) === 1) continue; // no 3-step runs
			}
			s.push(d);
		}
		return s;
	}

	function startTrial() {
		seq = genSeq(level);
		entry = '';
		phase = 'show';
		seq.forEach((d, i) => {
			later(() => (shownDigit = d), i * 1000);
			later(() => (shownDigit = null), i * 1000 + 700);
		});
		later(() => (phase = 'recall'), seq.length * 1000);
	}

	function finishBlock(span: number) {
		if (block === 'forward') {
			spans = { ...spans, forward: span };
			block = 'backward';
			level = START;
			attempt = 1;
			phase = 'between';
		} else {
			spans = { ...spans, backward: span };
			const f = spans.forward, b = span;
			const score = Math.round((normScore(f, 6.5, 1.0) + normScore(b, 4.8, 1.2)) / 2);
			result = { id: 'digit', score, value: f, value2: b, display: `fwd ${f} · bwd ${b}`, d: localDate() };
			phase = 'done';
			onComplete(result);
		}
	}

	function submit() {
		const typed = entry.replace(/\D/g, '').split('').map(Number);
		const target = block === 'forward' ? seq : [...seq].reverse();
		const correct = typed.length === target.length && typed.every((d, i) => d === target[i]);
		if (correct) {
			if (level >= CAP) return finishBlock(CAP);
			level += 1;
			attempt = 1;
			startTrial();
		} else if (attempt === 1) {
			attempt = 2;
			startTrial();
		} else {
			finishBlock(level - 1);
		}
	}
</script>

{#if phase === 'done' && result}
	<div class="text-center p-8 surface-2 rounded-2xl border hairline">
		<div class="t-ink2 font-medium mb-1">Digit Span complete.</div>
		<div class="text-3xl font-extrabold t-ink mb-2 tabular-nums">{result.display}</div>
		<p class="text-sm t-ink2">Adults average ~6.5 forward and ~4.8 backward — the task behind “7 ± 2” (Miller 1956).</p>
	</div>
{:else if phase === 'intro'}
	<div class="text-center">
		<p class="text-[15px] t-ink2 font-medium mb-6 max-w-md mx-auto">
			Digits appear <strong class="t-ink">one per second</strong>. Type them back in order. After that block, a second round —
			type them <strong class="t-ink">backwards</strong>. No writing them down!
		</p>
		<button class="px-8 py-4 btn-primary font-semibold rounded-xl" onclick={startTrial}>Start forward block</button>
	</div>
{:else if phase === 'between'}
	<div class="text-center">
		<div class="text-xs font-bold tracking-[0.2em] t-ink3 uppercase mb-3">Forward span: {spans.forward}</div>
		<p class="text-[15px] t-ink2 font-medium mb-6 max-w-md mx-auto">
			Now the harder half: type the digits in <strong class="t-ink">reverse order</strong> (last digit first).
		</p>
		<button class="px-8 py-4 btn-primary font-semibold rounded-xl" onclick={startTrial}>Start backward block</button>
	</div>
{:else}
	<div class="text-center">
		<div class="text-xs font-bold tracking-[0.2em] t-ink3 uppercase mb-6">
			{block} · {level} digits{attempt === 2 ? ' · second try' : ''}
		</div>
		{#if phase === 'show'}
			<div class="h-28 flex items-center justify-center">
				<span class="font-display text-7xl font-semibold t-accent tabular-nums">{shownDigit ?? ''}</span>
			</div>
		{:else}
			<p class="text-sm t-ink2 mb-4">{block === 'forward' ? 'Type the digits in order:' : 'Type the digits in REVERSE order:'}</p>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				bind:value={entry}
				type="text"
				inputmode="numeric"
				autocomplete="off"
				autofocus
				class="text-input w-48 px-4 py-3 rounded-xl text-center text-2xl tracking-[0.3em] tabular-nums"
				onkeydown={(e) => e.key === 'Enter' && entry.replace(/\D/g, '').length === level && submit()}
			/>
			<div class="mt-5">
				<button class="px-8 py-3 btn-primary font-semibold rounded-xl" disabled={entry.replace(/\D/g, '').length !== level} onclick={submit}>
					Submit
				</button>
			</div>
		{/if}
	</div>
{/if}
