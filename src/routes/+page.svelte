<script lang="ts">
	import { DIMS, TIER_INFO, buildQuestions } from '$lib/quiz/questions';
	import { buildSitting } from '$lib/quiz/scoring';
	import { LAB_TESTS, LAB_BY_ID } from '$lib/quiz/lab';
	import { loadHistory, saveHistory, clearHistoryStorage, getName, setName, getRoom, setRoom, profileFromHistory, loadLabs, saveLab, type LabStore } from '$lib/quiz/storage';
	import { showToast } from '$lib/toast.svelte';
	import Plane from '$lib/components/Plane.svelte';
	import LikertBatch from '$lib/components/LikertBatch.svelte';
	import VviqBlock from '$lib/components/VviqBlock.svelte';
	import VisualPuzzle from '$lib/components/VisualPuzzle.svelte';
	import RhymePuzzle from '$lib/components/RhymePuzzle.svelte';
	import RotationPuzzle from '$lib/components/RotationPuzzle.svelte';
	import Metronome from '$lib/components/Metronome.svelte';
	import ResultsView from '$lib/components/ResultsView.svelte';
	import ExportButton from '$lib/components/ExportButton.svelte';
	import VptTest from '$lib/components/lab/VptTest.svelte';
	import DigitSpanTest from '$lib/components/lab/DigitSpanTest.svelte';
	import CorsiTest from '$lib/components/lab/CorsiTest.svelte';
	import AnisochronyTest from '$lib/components/lab/AnisochronyTest.svelte';
	import ChangeDetectionTest from '$lib/components/lab/ChangeDetectionTest.svelte';
	import PseTest from '$lib/components/lab/PseTest.svelte';
	import { onMount } from 'svelte';
	import { FlaskConical } from '@lucide/svelte';
	import type { Answer, LabResult, LabTestId, Profile, Question, Sitting, TierName } from '$lib/quiz/types';

	const LAB_COMPONENTS = {
		vpt: VptTest,
		digit: DigitSpanTest,
		corsi: CorsiTest,
		aniso: AnisochronyTest,
		cdk: ChangeDetectionTest,
		pse: PseTest
	} as const;

	let screen = $state<'intro' | 'quiz' | 'results' | 'lab'>('intro');
	let labs = $state<LabStore>({});
	let activeLab = $state<LabTestId | null>(null);
	let activeLabDone = $state(false);
	let tier = $state<TierName>('quick');
	let questions = $state<Question[]>([]);
	let current = $state(0);
	let answers = $state<Answer[]>([]);
	// per-question mutable scratch owned by the puzzle components (trials, progress)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let scratches: any[] = [];
	let history = $state<Sitting[]>([]);
	let profile = $state<Profile | null>(null);
	let skips = $state<boolean[]>([]);
	let shareName = $state('');
	let roomCode = $state('');
	let joinedRoom = $state('');
	let shareUrl = $state('');

	onMount(() => {
		history = loadHistory();
		labs = loadLabs();
		profile = profileFromHistory(history, undefined, labs);
		shareName = getName();
		joinedRoom = getRoom();
		if (profile) screen = 'results';
	});

	function recordLab(result: LabResult) {
		labs = saveLab(result);
		profile = profileFromHistory(history, shareName, labs);
	}

	function completeLabRun(result: LabResult) {
		recordLab(result);
		activeLabDone = true;
	}

	function completeInlineLab(result: LabResult) {
		setAnswer(result);
		recordLab(result);
	}

	function start(t: TierName) {
		tier = t;
		questions = buildQuestions(t);
		answers = new Array(questions.length).fill(null);
		scratches = questions.map(() => ({}));
		current = 0;
		shareUrl = '';
		screen = 'quiz';
	}

	const q = $derived(questions[current]);
	const answered = $derived(answers.filter((a) => a !== null).length);
	const canNext = $derived(answers[current] !== null && answers[current] !== undefined);

	function setAnswer(val: Answer) {
		answers[current] = val;
	}
	function skip() {
		answers[current] = 'N/A';
		next(true);
	}
	function next(force = false) {
		if (!force && !canNext) return;
		if (current < questions.length - 1) current++;
		else finish();
	}
	function prev() {
		if (current > 0) current--;
	}

	function finish() {
		const { sitting, skips: sk } = buildSitting(questions, answers, tier);
		history = [...history, sitting];
		saveHistory(history);
		skips = history.length === 1 ? sk : [];
		profile = profileFromHistory(history, shareName, labs);
		screen = 'results';
	}

	function retake() {
		screen = 'intro';
	}
	function clearHistory() {
		if (!confirm('Delete all saved sittings on this device?')) return;
		history = [];
		clearHistoryStorage();
		profile = null;
		showToast('History cleared.');
		screen = 'intro';
	}

	async function copyShareLink() {
		if (!profile) return;
		setName(shareName.trim().slice(0, 24));
		profile.n = shareName.trim().slice(0, 24);
		try {
			const res = await fetch('/api/profiles', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(profile)
			});
			if (!res.ok) throw new Error('server error');
			const { code } = (await res.json()) as { code: string };
			shareUrl = `${location.origin}/p/${code}`;
			await navigator.clipboard.writeText(shareUrl);
			showToast('Share link copied!');
		} catch {
			showToast("Couldn't create the share link.", true);
		}
	}

	async function postToRoom(createNew: boolean = false) {
		if (!profile) return;
		const name = shareName.trim().slice(0, 24);
		if (!name) {
			showToast('Add your name first — the room needs to know who you are.', true);
			return;
		}
		setName(name);
		profile.n = name;
		try {
			let code = roomCode.trim().toUpperCase();
			if (createNew) {
				const res = await fetch('/api/rooms', { method: 'POST' });
				if (!res.ok) throw new Error('create failed');
				code = ((await res.json()) as { code: string }).code;
			}
			if (!code) {
				showToast('Enter a room code (or create a new room).', true);
				return;
			}
			const res = await fetch(`/api/rooms/${code}`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(profile)
			});
			if (res.status === 404) {
				showToast("That room code doesn't exist.", true);
				return;
			}
			if (!res.ok) throw new Error('join failed');
			joinedRoom = code;
			setRoom(code);
			showToast(createNew ? `Room ${code} created — you're in!` : `Posted to room ${code}!`);
		} catch {
			showToast("Couldn't reach the room server.", true);
		}
	}
</script>

<svelte:head>
	<title>Mindprint — Cognitive Spectrum Assessment</title>
	<meta name="description" content="A field guide to your inner world: map your mind across visual, verbal, spatial, and kinesthetic channels." />
</svelte:head>

{#if screen === 'quiz'}
	<div class="w-full h-1.5" style="background-color: var(--line);">
		<div class="h-1.5 transition-all duration-500 ease-out" style="width: {(answered / questions.length) * 100}%; background-color: var(--accent);"></div>
	</div>
{/if}

<div class="p-8 sm:p-12">
	{#if screen === 'intro'}
		<div class="text-center fade-enter">
			<div class="mb-8 flex justify-center gap-3">
				{#each DIMS as d, i}
					<div class="w-11 h-11 rounded-2xl flex items-center justify-center border hairline" style="color: var(--dim-{i}); background-color: var(--card-2);" title={d.key}>
						{@html d.glyph}
					</div>
				{/each}
			</div>
			<div class="text-xs font-bold tracking-[0.2em] uppercase t-ink3 mb-3">A field guide to your inner world</div>
			<h1 class="font-display text-4xl sm:text-5xl font-semibold mb-6 t-ink">How does your mind think?</h1>
			<p class="t-ink2 mb-4 leading-relaxed text-[15px]">
				Some minds run a movie. Some narrate everything. Some think in maps, and some in muscle.
				About 1 in 100 people have no mind's eye at all (<em>aphantasia</em>), while 1 in 16 see mental images as vividly as
				real life — and inner speech ranges from “never” to “nearly every waking moment.”
			</p>
			<p class="t-ink2 mb-8 leading-relaxed text-[15px]">
				Self-reports plus tiny objective tests map your mind across four channels —
				<strong class="t-ink">Visual, Verbal, Spatial, Kinesthetic</strong> — into your shareable
				<span class="font-display t-accent text-lg">Mindprint</span>. Like a real psychology instrument, more questions mean a
				more accurate score: pick your depth.
			</p>

			<div class="space-y-3 mb-8 text-left">
				<button class="tier-card w-full rounded-2xl p-5 sm:flex sm:items-center sm:gap-4" onclick={() => start('quick')}>
					<div class="flex-1">
						<div class="font-bold t-ink">Quick <span class="t-ink3 font-semibold text-sm">· ~5 min</span></div>
						<div class="text-sm t-ink2 mt-0.5">One question of each kind per channel. A fun ballpark.</div>
					</div>
					<div class="text-xs font-bold t-ink3 whitespace-nowrap tabular-nums mt-2 sm:mt-0">±13 typical error</div>
				</button>
				<button class="tier-card w-full rounded-2xl p-5 sm:flex sm:items-center sm:gap-4" style="border-color: var(--accent);" onclick={() => start('standard')}>
					<div class="flex-1">
						<div class="font-bold t-ink">
							Standard <span class="t-ink3 font-semibold text-sm">· ~15 min</span>
							<span class="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ml-1" style="background-color: var(--accent-soft); color: var(--accent);">recommended</span>
						</div>
						<div class="text-sm t-ink2 mt-0.5">Four statements per channel and 6-trial objective tests. A solid measurement.</div>
					</div>
					<div class="text-xs font-bold t-ink3 whitespace-nowrap tabular-nums mt-2 sm:mt-0">±9 typical error</div>
				</button>
				<button class="tier-card w-full rounded-2xl p-5 sm:flex sm:items-center sm:gap-4" onclick={() => start('thorough')}>
					<div class="flex-1">
						<div class="font-bold t-ink">Thorough <span class="t-ink3 font-semibold text-sm">· ~50 min</span></div>
						<div class="text-sm t-ink2 mt-0.5">Everything in Standard plus a real mini-VVIQ, reaction-time scoring, a two-tempo rhythm battery, and four classic lab tests (digit span, Corsi blocks, pattern span, beat detection).</div>
					</div>
					<div class="text-xs font-bold t-ink3 whitespace-nowrap tabular-nums mt-2 sm:mt-0">±6 typical error</div>
				</button>
			</div>

			{#if profile}
				<button class="text-sm font-semibold t-accent underline mb-4" onclick={() => (screen = 'results')}>← Back to your results</button>
			{/if}
			<p class="text-xs t-ink3 leading-relaxed">
				Retakes on any day average into your profile and tighten the error further.<br />
				For fun, not diagnosis — built on items and norms from real instruments (VVIQ, IRQ, OSIVQ, VISQ) but not a validated test.
			</p>
		</div>
	{:else if screen === 'quiz' && q}
		<div class="fade-enter">
			<div class="mb-5 flex items-center justify-between">
				<div class="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style="color: var(--dim-{q.dim})">
					{@html DIMS[q.dim].glyph}<span>{DIMS[q.dim].key} · {DIMS[q.dim].sub}</span>
				</div>
				<div class="text-xs font-semibold t-ink3 tabular-nums">{current + 1} / {questions.length}</div>
			</div>
			<h2 class="font-display text-2xl sm:text-[28px] font-medium mb-8 t-ink leading-snug">{'title' in q ? q.title : q.text}</h2>

			<div class="mb-10 min-h-[160px]">
				{#key current}
					{#if q.type === '2d-plane'}
						<Plane {q} answer={answers[current]} onAnswer={setAnswer} />
					{:else if q.type === 'likert-batch'}
						<LikertBatch {q} answer={answers[current]} onAnswer={setAnswer} />
					{:else if q.type === 'vviq'}
						<VviqBlock answer={answers[current]} scratch={scratches[current]} onAnswer={setAnswer} />
					{:else if q.type === 'puzzle-visual'}
						<VisualPuzzle {tier} answer={answers[current]} scratch={scratches[current]} onAnswer={setAnswer} />
					{:else if q.type === 'puzzle-verbal'}
						<RhymePuzzle {tier} answer={answers[current]} scratch={scratches[current]} onAnswer={setAnswer} />
					{:else if q.type === 'puzzle-spatial'}
						<RotationPuzzle {tier} answer={answers[current]} scratch={scratches[current]} onAnswer={setAnswer} />
					{:else if q.type === 'puzzle-kinesthetic'}
						<Metronome {tier} answer={answers[current]} scratch={scratches[current]} onAnswer={setAnswer} />
					{:else if q.role === 'labtest'}
						{@const LabComp = LAB_COMPONENTS[q.labId]}
						{@const prev = answers[current]}
						<LabComp
							onComplete={completeInlineLab}
							existing={prev && typeof prev === 'object' && 'id' in prev ? (prev as LabResult) : null}
						/>
					{/if}
				{/key}
			</div>

			<div class="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t hairline">
				<button onclick={skip} class="text-sm font-medium t-ink3 hover:t-ink2 transition-colors order-2 sm:order-1">
					Not applicable / skip
				</button>
				<div class="flex gap-3 w-full sm:w-auto order-1 sm:order-2">
					<button onclick={prev} class="flex-1 sm:flex-none px-6 py-3 btn-ghost font-semibold rounded-xl {current === 0 ? 'invisible' : ''}">Back</button>
					<button onclick={() => next()} disabled={!canNext} class="flex-1 sm:flex-none px-8 py-3 btn-primary font-semibold rounded-xl">
						{current === questions.length - 1 ? 'Reveal my Mindprint' : 'Next'}
					</button>
				</div>
			</div>
		</div>
	{:else if screen === 'results' && profile}
		<div class="fade-enter">
			<ResultsView {profile} {skips} {history} onClearHistory={clearHistory}>
				<div class="surface-2 p-6 rounded-2xl mb-8 border hairline">
					<h4 class="text-xs font-bold tracking-[0.2em] t-ink3 uppercase mb-4 text-center">Share &amp; compare</h4>
					<div class="flex flex-col sm:flex-row gap-3 mb-3">
						<input bind:value={shareName} type="text" maxlength="24" placeholder="Your name" class="text-input flex-1 px-4 py-3 rounded-xl text-sm font-medium" />
						<button onclick={copyShareLink} class="px-6 py-3 btn-primary font-semibold rounded-xl text-sm whitespace-nowrap">Copy share link</button>
					</div>
					{#if shareUrl}
						<p class="text-xs t-accent font-semibold text-center mb-3 break-all">{shareUrl}</p>
					{/if}
					<div class="border-t hairline pt-4 mt-1">
						<div class="flex flex-col sm:flex-row gap-3">
							<input bind:value={roomCode} type="text" maxlength="8" placeholder="Family room code" class="text-input flex-1 px-4 py-3 rounded-xl text-sm font-medium uppercase" />
							<button onclick={() => postToRoom(false)} class="px-5 py-3 btn-ghost font-semibold rounded-xl text-sm whitespace-nowrap">Join room</button>
							<button onclick={() => postToRoom(true)} class="px-5 py-3 btn-ghost font-semibold rounded-xl text-sm whitespace-nowrap">Create room</button>
						</div>
						<div class="mt-3">
							<button onclick={() => { activeLab = null; activeLabDone = false; screen = 'lab'; }} class="w-full px-6 py-3 btn-ghost font-semibold rounded-xl text-sm inline-flex items-center justify-center gap-2">
								<FlaskConical size={16} /> Open the Lab — six classic tests, 3–4 min each
							</button>
						</div>
						{#if joinedRoom}
							<p class="text-sm text-center mt-3">
								<a href="/room/{joinedRoom}" class="t-accent font-bold underline">View family room {joinedRoom} →</a>
							</p>
						{/if}
					</div>
					<p class="text-xs t-ink3 mt-3 text-center leading-relaxed">
						Share links show your profile to anyone; a family room collects everyone's Mindprints in one live comparison.
					</p>
				</div>

				<div class="flex flex-col sm:flex-row gap-4">
					<ExportButton {profile} getCanvas={() => document.querySelector('.mp-radar canvas')} />
					<button onclick={retake} class="flex-1 px-6 py-4 btn-ghost font-semibold rounded-xl">Take it again</button>
				</div>
			</ResultsView>
		</div>
	{:else if screen === 'lab'}
		<div class="fade-enter">
			<div class="text-center mb-6">
				<h2 class="text-xs font-bold tracking-[0.2em] t-ink3 uppercase mb-3">The Lab</h2>
				<h3 class="font-display text-3xl font-semibold t-ink">
					{activeLab ? LAB_BY_ID[activeLab].name : 'Classic tests, one number each'}
				</h3>
				{#if !activeLab}
					<p class="text-sm t-ink2 mt-3 max-w-md mx-auto">
						Six paradigms straight from the cognitive-psychology literature. Each takes a few minutes, yields a number you
						can compare to published adult norms, and sharpens your Mindprint.
					</p>
				{/if}
			</div>

			{#if activeLab}
				{@const ActiveComp = LAB_COMPONENTS[activeLab]}
				{#key activeLab}
					<ActiveComp onComplete={completeLabRun} />
				{/key}
				<div class="mt-8">
					{#if activeLabDone}
						<button onclick={() => { activeLab = null; activeLabDone = false; }} class="w-full px-6 py-4 btn-primary font-semibold rounded-xl">
							Back to the Lab
						</button>
					{:else}
						<button onclick={() => { activeLab = null; activeLabDone = false; }} class="w-full px-6 py-3 text-sm t-ink3 hover:t-ink2">
							Cancel — nothing is saved until a test finishes
						</button>
					{/if}
				</div>
			{:else}
				<div class="space-y-3 mb-8">
					{#each LAB_TESTS as t}
						{@const r = labs[t.id]}
						<div class="surface-2 border hairline rounded-2xl p-4 sm:flex sm:items-center sm:gap-4">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 flex-wrap">
									<span class="font-bold t-ink">{t.name}</span>
									<span class="text-xs t-ink3">· {t.minutes} ·</span>
									<span class="text-xs font-bold uppercase tracking-wider" style="color: var(--dim-{t.dim})">{DIMS[t.dim].key}</span>
								</div>
								<p class="text-sm t-ink2 mt-1">{t.blurb}</p>
								<p class="text-[11px] t-ink3 mt-1 italic">{t.citation}</p>
								{#if r}
									<p class="text-sm font-semibold t-accent mt-1 tabular-nums">Your result: {r.display} <span class="t-ink3 font-normal">({r.d})</span></p>
								{/if}
							</div>
							<button
								onclick={() => { activeLab = t.id; activeLabDone = false; }}
								class="mt-3 sm:mt-0 px-6 py-3 {r ? 'btn-ghost' : 'btn-primary'} font-semibold rounded-xl text-sm whitespace-nowrap"
							>
								{r ? 'Run again' : 'Run test'}
							</button>
						</div>
					{/each}
				</div>
				<button onclick={() => (screen = profile ? 'results' : 'intro')} class="w-full px-6 py-4 btn-ghost font-semibold rounded-xl">
					← Back to {profile ? 'results' : 'start'}
				</button>
			{/if}
		</div>
	{/if}
</div>
