<script lang="ts">
	import { untrack } from 'svelte';
	import type { Answer, PlaneAnswer } from '$lib/quiz/types';

	interface Props {
		q: { subtext: string };
		answer?: Answer;
		onAnswer: (a: PlaneAnswer) => void;
	}
	let { q, answer = null, onAnswer }: Props = $props();

	let container = $state<HTMLDivElement | null>(null);
	let isDragging = false;
	// seeded from the answer's initial value; later updates flow the other way (untrack = intentional)
	let pos = $state<PlaneAnswer | null>(
		untrack(() =>
			answer && typeof answer === 'object' && 'capacity' in answer
				? { capacity: answer.capacity, usage: answer.usage }
				: null
		)
	);

	function set(capacity: number, usage: number) {
		pos = { capacity, usage };
		onAnswer({ capacity, usage });
	}

	function fromPointer(e: MouseEvent | TouchEvent) {
		if (!container) return;
		const rect = container.getBoundingClientRect();
		let clientX: number | undefined;
		let clientY: number | undefined;
		if ('touches' in e && e.touches.length > 0) {
			clientX = e.touches[0].clientX;
			clientY = e.touches[0].clientY;
		} else if ('clientX' in e) {
			clientX = e.clientX;
			clientY = e.clientY;
		}
		if (clientX === undefined || clientY === undefined) return;
		const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
		const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
		set(100 - (y / rect.height) * 100, (x / rect.width) * 100);
	}

	function handleStart(e: MouseEvent | TouchEvent) { isDragging = true; fromPointer(e); }
	function handleMove(e: MouseEvent | TouchEvent) { if (isDragging) fromPointer(e); }
	function handleEnd() { isDragging = false; }
	function handleKey(e: KeyboardEvent) {
		const step = 3;
		let { capacity, usage } = pos || { capacity: 50, usage: 50 };
		if (e.key === 'ArrowUp') capacity = Math.min(100, capacity + step);
		else if (e.key === 'ArrowDown') capacity = Math.max(0, capacity - step);
		else if (e.key === 'ArrowRight') usage = Math.min(100, usage + step);
		else if (e.key === 'ArrowLeft') usage = Math.max(0, usage - step);
		else return;
		e.preventDefault();
		set(capacity, usage);
	}
</script>

<svelte:window onmousemove={handleMove} onmouseup={handleEnd} ontouchmove={handleMove} ontouchend={handleEnd} />

<div class="flex flex-col items-center mt-2">
	<p class="text-sm t-ink2 mb-6 text-center max-w-md leading-relaxed">{@html q.subtext}</p>
	<div
		bind:this={container}
		class="relative w-full max-w-xs sm:max-w-sm mx-auto aspect-square surface-2 border-2 hairline-2 rounded-2xl overflow-hidden cursor-crosshair select-none shadow-inner"
		style="touch-action: none;"
		tabindex="0"
		role="slider"
		aria-valuenow={pos ? Math.round(pos.capacity) : 50}
		aria-label="Two-dimensional rating: up-down is ability, left-right is usage. Use arrow keys to adjust."
		onmousedown={handleStart}
		ontouchstart={handleStart}
		onkeydown={handleKey}
	>
		<div class="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2" style="background-color: var(--line-2);"></div>
		<div class="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2" style="background-color: var(--line-2);"></div>
		<span class="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] sm:text-[10px] font-bold t-ink3 uppercase tracking-widest pointer-events-none px-2 rounded" style="background-color: var(--card-2);">High ability</span>
		<span class="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] sm:text-[10px] font-bold t-ink3 uppercase tracking-widest pointer-events-none px-2 rounded" style="background-color: var(--card-2);">Low ability</span>
		<span class="absolute right-[-30px] top-1/2 -translate-y-1/2 text-[9px] sm:text-[10px] font-bold t-ink3 uppercase tracking-widest pointer-events-none rotate-90 origin-center px-2 rounded whitespace-nowrap" style="background-color: var(--card-2);">Constant use</span>
		<span class="absolute left-[-22px] top-1/2 -translate-y-1/2 text-[9px] sm:text-[10px] font-bold t-ink3 uppercase tracking-widest pointer-events-none -rotate-90 origin-center px-2 rounded whitespace-nowrap" style="background-color: var(--card-2);">Rare use</span>
		{#if pos}
			<div
				class="absolute w-6 h-6 rounded-full border-4 shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
				style="background-color: var(--accent); border-color: var(--card); left: {pos.usage}%; top: {100 - pos.capacity}%;"
			></div>
		{/if}
	</div>
	<div class="mt-6 text-sm font-semibold t-accent h-6 tabular-nums">
		{#if pos}Ability: {Math.round(pos.capacity)}% | Usage: {Math.round(pos.usage)}%{/if}
	</div>
</div>
