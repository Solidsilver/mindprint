<script lang="ts">
	import { TIER_INFO } from '$lib/quiz/questions';
	import { kinBand, kinScore } from '$lib/quiz/scoring';
	import { onDestroy } from 'svelte';
	import type { Answer, KinAnswer, TierName } from '$lib/quiz/types';

	interface BlockResult {
		int: number;
		err: number;
		signed: number;
		intervals: number[];
		score: number;
	}
	interface Props {
		tier: TierName;
		answer?: Answer;
		scratch: { blockResults?: BlockResult[] };
		onAnswer: (a: KinAnswer) => void;
	}
	let { tier, answer = null, scratch, onAnswer }: Props = $props();

	const blocks = TIER_INFO[tier].taps;
	if (!scratch.blockResults) scratch.blockResults = [];
	const blockResults = scratch.blockResults;

	let done = $state(Boolean(answer && answer !== 'N/A'));
	let blockIdx = $state(blockResults.length);
	let phase = $state<'ready' | 'pacing' | 'tapping'>('ready');
	let tapsLeft = $state(0);
	let pulsing = $state(false);

	let audioCtx: AudioContext | null = null;
	let audioMaster: GainNode | null = null;
	let timers: ReturnType<typeof setTimeout>[] = [];
	let taps: number[] = [];
	let fourthPulseTime = 0;

	function schedule(fn: () => void, ms: number) {
		timers.push(setTimeout(fn, ms));
	}
	onDestroy(() => {
		timers.forEach(clearTimeout);
		if (audioMaster) try { audioMaster.disconnect(); } catch { /* noop */ }
	});

	function audioClick(when: number, freq: number) {
		if (!audioCtx || !audioMaster) return;
		const osc = audioCtx.createOscillator();
		const gain = audioCtx.createGain();
		osc.frequency.value = freq;
		osc.type = 'sine';
		gain.gain.setValueAtTime(0.001, when);
		gain.gain.exponentialRampToValueAtTime(0.4, when + 0.005);
		gain.gain.exponentialRampToValueAtTime(0.001, when + 0.06);
		osc.connect(gain).connect(audioMaster);
		osc.start(when);
		osc.stop(when + 0.08);
	}

	function pulse() {
		pulsing = true;
		schedule(() => (pulsing = false), 60);
	}

	function start() {
		const block = blocks[blockIdx];
		phase = 'pacing';
		try {
			if (!audioCtx)
				audioCtx = new (window.AudioContext ||
					(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
			audioCtx.resume();
			audioMaster = audioCtx.createGain();
			audioMaster.gain.value = 1;
			audioMaster.connect(audioCtx.destination);
		} catch {
			audioCtx = null;
		}

		const I = block.int;
		const perfStart = performance.now() + 200;
		if (audioCtx) {
			const audioStart = audioCtx.currentTime + 0.2;
			for (let i = 0; i < 4; i++) audioClick(audioStart + i * (I / 1000), 880);
		}
		// Visual pulses scheduled against wall-clock targets (no drift accumulation)
		for (let i = 0; i < 4; i++) {
			schedule(pulse, perfStart + i * I - performance.now());
		}

		fourthPulseTime = perfStart + 3 * I;
		schedule(() => {
			taps = [];
			tapsLeft = block.n;
			phase = 'tapping';
		}, fourthPulseTime - performance.now());
	}

	function tap(e: MouseEvent | TouchEvent) {
		if (e.type === 'touchstart') e.preventDefault();
		const block = blocks[blockIdx];
		if (phase !== 'tapping' || taps.length >= block.n) return;
		taps.push(performance.now());
		if (audioCtx) audioClick(audioCtx.currentTime, 660);
		pulse();
		tapsLeft = block.n - taps.length;

		if (taps.length === block.n) {
			const I = block.int;
			const intervals: number[] = [];
			let last = fourthPulseTime;
			for (const tp of taps) {
				intervals.push(tp - last);
				last = tp;
			}
			const avgError = intervals.reduce((a, b) => a + Math.abs(b - I), 0) / intervals.length;
			const meanSigned = intervals.reduce((a, b) => a + (b - I), 0) / intervals.length;
			blockResults.push({ int: I, err: avgError, signed: meanSigned, intervals, score: kinScore(avgError, I) });

			if (blockResults.length === blocks.length) {
				const b0 = blockResults[0];
				const score = Math.round(blockResults.reduce((a, b) => a + b.score, 0) / blockResults.length);
				onAnswer({
					score,
					avgError: b0.err,
					meanSigned: b0.signed,
					intervals: b0.intervals,
					blocks: blockResults.map((b) => ({ int: b.int, err: b.err, signed: b.signed }))
				});
				done = true;
			}
			blockIdx = blockResults.length;
			phase = 'ready';
		}
	}

	const block = $derived(blocks[Math.min(blockIdx, blocks.length - 1)]);
	const tempoDesc = $derived(block.int === 1000 ? 'one per second' : `faster — one every ${block.int / 1000}s`);
	const doneAns = $derived(answer && typeof answer === 'object' && 'avgError' in answer ? answer : null);
</script>

{#if done && doneAns}
	{@const error = Math.round(doneAns.avgError)}
	{@const signed = Math.round(doneAns.meanSigned)}
	{@const band = kinBand(error)}
	<div class="p-8 surface-2 rounded-2xl border hairline text-center">
		<div class="t-ink2 font-medium mb-1">Metronome test completed.</div>
		<div class="text-2xl font-extrabold t-ink mb-1 tabular-nums">
			Avg drift: ±{error}ms <span class="text-base font-bold" style="color: var(--{band.cls})">({band.label})</span>
		</div>
		<div class="text-sm t-ink2">
			{#if Math.abs(signed) < 15}Dead-on tempo overall.
			{:else if signed < 0}You ran about {Math.abs(signed)}ms fast per beat — most people rush slightly without noticing.
			{:else}You ran about {signed}ms slow per beat.{/if}
		</div>
		{#if doneAns.blocks && doneAns.blocks.length > 1}
			<div class="text-sm t-ink2 mt-2">Fast block (0.6s beat): ±{Math.round(doneAns.blocks[1].err)}ms per beat.</div>
		{/if}
		<div class="flex items-end justify-center gap-2 mt-12 mb-8 h-32 relative">
			<div class="absolute bottom-1/2 left-0 right-0 border-t-2 border-dashed z-0" style="border-color: var(--line-2);"></div>
			<div class="absolute bottom-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 text-[10px] font-bold t-ink3 uppercase tracking-widest z-0" style="background-color: var(--card-2);">1000ms</div>
			{#each doneAns.intervals as interval, idx}
				{@const diff = Math.abs(interval - 1000)}
				{@const pct = Math.min(100, Math.max(4, (interval / 2000) * 100))}
				{@const color = diff < 65 ? 'var(--good)' : diff < 105 ? 'var(--warn)' : 'var(--bad)'}
				<div class="flex flex-col items-center justify-end h-full group relative z-10">
					<div class="absolute -top-8 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20" style="background-color: var(--ink);">
						{Math.round(interval)}ms
					</div>
					<div class="w-6 rounded-t-sm transition-all hover:opacity-80" style="height: {pct}%; background-color: {color};"></div>
					<div class="absolute -bottom-6 text-xs t-ink3 font-semibold tabular-nums">{idx + 5}</div>
				</div>
			{/each}
		</div>
	</div>
{:else}
	<div class="text-center py-6">
		{#if blocks.length > 1}
			<div class="text-xs font-bold tracking-[0.2em] t-ink3 uppercase mb-4">Block {blockIdx + 1} of {blocks.length}</div>
		{/if}
		<p class="text-[15px] t-ink2 font-medium mb-8 max-w-md mx-auto">
			You'll hear (and see) 4 beats, {tempoDesc}. When they stop,
			<strong class="t-ink">keep the beat going</strong> by tapping the button {block.n} more times. Sound on helps!
		</p>
		<div class="pulse-circle mb-8 {pulsing ? 'pulse-active' : ''}"></div>
		{#if phase === 'ready'}
			<button class="px-10 py-4 btn-primary font-bold rounded-xl shadow-lg active:scale-95 w-48" onclick={start}>
				{blockIdx === 0 ? 'Start metronome' : 'Start fast block'}
			</button>
		{:else if phase === 'pacing'}
			<button class="px-10 py-4 btn-primary font-bold rounded-xl shadow-lg w-48" disabled>Listen…</button>
		{:else}
			<button class="px-10 py-4 btn-primary font-bold rounded-xl shadow-lg active:scale-95 w-48" onmousedown={tap} ontouchstart={tap}>TAP!</button>
		{/if}
		<div class="text-sm t-ink3 font-semibold mt-4 h-5">
			{#if phase === 'tapping'}{tapsLeft} taps remaining{/if}
		</div>
	</div>
{/if}
