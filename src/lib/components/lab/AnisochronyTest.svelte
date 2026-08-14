<script lang="ts">
	// Anisochrony detection (Hyde & Peretz 2004; BAASTA, Dalla Bella et al. 2017),
	// as a bias-free 2AFC: two 5-tone sequences (1047 Hz, 150 ms, IOI 600 ms);
	// in one of them the 4th tone comes early. A 2-down-1-up staircase converges
	// on the ~70.7% threshold, reported as % of the beat interval.
	// Non-musicians typically land ~5-10%; lab JNDs run ~3.5%.
	import { onDestroy } from 'svelte';
	import { localDate } from '$lib/quiz/scoring';
	import { normScore, type LabResult } from '$lib/quiz/lab';

	let { onComplete, existing = null }: { onComplete: (r: LabResult) => void; existing?: LabResult | null } = $props();

	const IOI = 600, TONE_MS = 150, FREQ = 1047, N_TONES = 5;
	const START_DELTA = 120, MIN_DELTA = 6, MAX_DELTA = 180;
	const MAX_TRIALS = 24, TARGET_REVERSALS = 8;

	let phase = $state<'intro' | 'playing' | 'respond' | 'done'>(existing ? 'done' : 'intro');
	let trial = $state(0);
	let playingSeq = $state(0); // 1 or 2 while audible
	let result = $state<LabResult | null>(existing);

	let delta = START_DELTA;
	let correctStreak = 0;
	let reversals: number[] = [];
	let lastDir: 'down' | 'up' | null = null;
	let oddIsFirst = false;

	let audioCtx: AudioContext | null = null;
	let master: GainNode | null = null;
	let timers: ReturnType<typeof setTimeout>[] = [];
	const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));
	onDestroy(() => {
		timers.forEach(clearTimeout);
		if (master) try { master.disconnect(); } catch { /* noop */ }
	});

	function tone(when: number) {
		if (!audioCtx || !master) return;
		const osc = audioCtx.createOscillator();
		const gain = audioCtx.createGain();
		osc.frequency.value = FREQ;
		osc.type = 'sine';
		gain.gain.setValueAtTime(0.001, when);
		gain.gain.exponentialRampToValueAtTime(0.35, when + 0.008);
		gain.gain.setValueAtTime(0.35, when + TONE_MS / 1000 - 0.03);
		gain.gain.exponentialRampToValueAtTime(0.001, when + TONE_MS / 1000);
		osc.connect(gain).connect(master);
		osc.start(when);
		osc.stop(when + TONE_MS / 1000 + 0.01);
	}

	function scheduleSequence(startAt: number, hiccup: boolean): number {
		for (let i = 0; i < N_TONES; i++) {
			let t = startAt + (i * IOI) / 1000;
			if (hiccup && i === 3) t -= delta / 1000; // 4th tone early
			tone(t);
		}
		return startAt + ((N_TONES - 1) * IOI) / 1000 + TONE_MS / 1000;
	}

	function playTrial() {
		if (!audioCtx) {
			audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
			master = audioCtx.createGain();
			master.gain.value = 1;
			master.connect(audioCtx.destination);
		}
		audioCtx.resume();
		phase = 'playing';
		oddIsFirst = Math.random() < 0.5;
		const t0 = audioCtx.currentTime + 0.25;
		const end1 = scheduleSequence(t0, oddIsFirst);
		const t2 = end1 + 0.7;
		const end2 = scheduleSequence(t2, !oddIsFirst);
		const now = audioCtx.currentTime;
		playingSeq = 1;
		later(() => (playingSeq = 2), (t2 - now) * 1000);
		later(() => {
			playingSeq = 0;
			phase = 'respond';
		}, (end2 - now) * 1000 + 150);
	}

	function finish() {
		const tail = reversals.slice(-4);
		const thrMs = tail.length ? tail.reduce((a, b) => a + b, 0) / tail.length : delta;
		const thrPct = Math.round((thrMs / IOI) * 1000) / 10;
		result = {
			id: 'aniso',
			score: normScore(thrPct, 7, 3, false),
			value: thrPct,
			display: `±${thrPct}% of the beat`,
			d: localDate()
		};
		phase = 'done';
		onComplete(result);
	}

	function answer(first: boolean) {
		trial += 1;
		const correct = first === oddIsFirst;
		const factor = reversals.length < 2 ? 1.5 : 1.25;
		let dir: 'down' | 'up' | null = null;
		if (correct) {
			correctStreak += 1;
			if (correctStreak >= 2) {
				correctStreak = 0;
				delta = Math.max(MIN_DELTA, delta / factor);
				dir = 'down';
			}
		} else {
			correctStreak = 0;
			delta = Math.min(MAX_DELTA, delta * factor);
			dir = 'up';
		}
		if (dir && lastDir && dir !== lastDir) reversals.push(delta);
		if (dir) lastDir = dir;

		if (reversals.length >= TARGET_REVERSALS || trial >= MAX_TRIALS) finish();
		else playTrial();
	}
</script>

{#if phase === 'done' && result}
	<div class="text-center p-8 surface-2 rounded-2xl border hairline">
		<div class="t-ink2 font-medium mb-1">Steady Beat complete.</div>
		<div class="text-3xl font-extrabold t-ink mb-2 tabular-nums">{result.display}</div>
		<p class="text-sm t-ink2">
			You can hear a hiccup of {result.value}% of the beat interval. Non-musicians typically land ~5–10%; sharp ears ~3.5%
			(Hyde &amp; Peretz 2004; BAASTA 2017).
		</p>
	</div>
{:else if phase === 'intro'}
	<div class="text-center">
		<p class="text-[15px] t-ink2 font-medium mb-2 max-w-md mx-auto">
			You'll hear <strong class="t-ink">two short beat sequences</strong>. One is perfectly steady; the other has a
			<strong class="t-ink">hiccup</strong> — one beat lands early. Which one had the hiccup?
		</p>
		<p class="text-xs t-ink3 mb-6">It gets harder as you get it right. Sound on — headphones help.</p>
		<button class="px-8 py-4 btn-primary font-semibold rounded-xl" onclick={playTrial}>Start listening</button>
	</div>
{:else}
	<div class="text-center py-4">
		<div class="text-xs font-bold tracking-[0.2em] t-ink3 uppercase mb-6">Trial {trial + 1}</div>
		<div class="flex justify-center gap-4 mb-8">
			{#each [1, 2] as s}
				<div class="w-20 h-20 rounded-2xl border-2 flex items-center justify-center text-2xl font-extrabold transition-colors {playingSeq === s ? 'hairline-2' : 'hairline'}"
					style="background-color: {playingSeq === s ? 'var(--accent-soft)' : 'var(--card-2)'}; color: {playingSeq === s ? 'var(--accent)' : 'var(--ink-3)'};">
					{s}
				</div>
			{/each}
		</div>
		{#if phase === 'respond'}
			<p class="text-sm t-ink2 mb-4">Which sequence had the hiccup?</p>
			<div class="flex justify-center gap-4">
				<button class="px-8 py-4 btn-ghost font-semibold rounded-xl" onclick={() => answer(true)}>First</button>
				<button class="px-8 py-4 btn-ghost font-semibold rounded-xl" onclick={() => answer(false)}>Second</button>
			</div>
		{:else}
			<p class="text-sm t-ink3">Listen…</p>
		{/if}
	</div>
{/if}
