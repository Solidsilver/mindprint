<script lang="ts">
	import { TIER_INFO, MR_SHAPES, shapeSVG, type MRShape } from '$lib/quiz/questions';
	import { shuffle, sample, chanceCorrect, median } from '$lib/quiz/scoring';
	import type { Answer, PuzzleAnswer, TierName } from '$lib/quiz/types';

	interface Option {
		rot: number;
		mirrored: boolean;
	}
	interface Trial {
		shape: MRShape;
		options: Option[];
	}
	interface Props {
		tier: TierName;
		answer?: Answer;
		scratch: { trials?: Trial[]; results?: number[]; rts?: number[] };
		onAnswer: (a: PuzzleAnswer) => void;
	}
	let { tier, answer = null, scratch, onAnswer }: Props = $props();

	const nTrials = TIER_INFO[tier].rot;

	function makeTrial(shape: MRShape): Trial {
		const correctRot = [90, 180, 270][Math.floor(Math.random() * 3)];
		const mirrorRots = sample([0, 90, 180, 270], 3);
		const options = shuffle<Option>([
			{ rot: correctRot, mirrored: false },
			...mirrorRots.map((r) => ({ rot: r, mirrored: true }))
		]);
		return { shape, options };
	}

	if (!scratch.trials) {
		const easy = shuffle(MR_SHAPES.filter((s) => !s.hard));
		const hard = shuffle(MR_SHAPES.filter((s) => s.hard));
		let pool: MRShape[];
		if (tier === 'quick') pool = easy.slice(0, 2);
		else if (tier === 'standard') pool = shuffle([...easy, ...hard]).slice(0, 6);
		else pool = shuffle([...easy, ...hard, ...easy, ...hard]).slice(0, 12);
		scratch.trials = pool.map(makeTrial);
		scratch.results = [];
		scratch.rts = [];
	}
	const trials = scratch.trials;
	const results = scratch.results ?? (scratch.results = []);
	const rts = scratch.rts ?? (scratch.rts = []);

	let done = $state(Boolean(answer && answer !== 'N/A'));
	let trialIdx = $state(results.length);
	const trial = $derived(trials[Math.min(trialIdx, nTrials - 1)]);
	let shownAt = performance.now();

	$effect(() => {
		void trialIdx; // re-arm the clock whenever a new trial renders
		shownAt = performance.now();
	});

	function pick(opt: Option) {
		results.push(opt.mirrored ? 0 : 1);
		rts.push(performance.now() - shownAt);
		if (results.length === nTrials) {
			const correct = results.reduce((a, b) => a + b, 0);
			const acc = chanceCorrect((correct / nTrials) * 100, 0.25);
			let score = acc;
			let medRT: number | null = null;
			if (tier === 'thorough') {
				medRT = median(rts);
				// Real MRTs score speed+accuracy; 80/20 blend, full speed credit at <=2s, none at >=8s
				const speedScore = Math.max(0, Math.min(100, ((8000 - medRT) / 6000) * 100));
				score = 0.8 * acc + 0.2 * speedScore;
			}
			onAnswer({ score, detail: `${correct}/${nTrials}`, medRT });
			done = true;
		}
		trialIdx = results.length;
	}

	const doneAns = $derived(answer && typeof answer === 'object' && 'detail' in answer ? (answer as PuzzleAnswer) : null);
</script>

{#if done && doneAns}
	<div class="text-center p-8 surface-2 rounded-2xl border hairline t-ink2 font-medium">
		Mental rotation test completed — {doneAns.detail} correct{doneAns.medRT ? ` (median ${(doneAns.medRT / 1000).toFixed(1)}s per item)` : ''}.
	</div>
{:else}
	<div class="text-center">
		<div class="text-xs font-bold tracking-[0.2em] t-ink3 uppercase mb-4">Trial {trialIdx + 1} of {nTrials}</div>
		<p class="text-[15px] t-ink2 font-medium mb-5 max-w-md mx-auto">
			One of the four tiles below is this same shape, just <strong class="t-ink">rotated</strong>. The other three are mirror
			images. Which one matches?
			{#if tier === 'thorough' && trialIdx === 0}<span class="t-ink3">(Speed counts a little in Thorough mode.)</span>{/if}
		</p>
		<div class="inline-block target-tile surface-2 border-2 hairline-2 rounded-2xl p-2 mb-6">
			{@html shapeSVG(trial.shape.cells, 0, false, 110)}
		</div>
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-md mx-auto">
			{#each trial.options as opt}
				<button class="rotation-tile p-2 flex items-center justify-center" onclick={() => pick(opt)}>
					{@html shapeSVG(trial.shape.cells, opt.rot, opt.mirrored, 88)}
				</button>
			{/each}
		</div>
	</div>
{/if}
