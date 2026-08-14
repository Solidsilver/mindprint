<script lang="ts">
	// A population band strip: the real published bands drawn to scale on the
	// score axis, with a "you are here" marker and an optional ± error whisker.
	import type { Strip } from '$lib/quiz/types';

	let { strip, color = 'var(--accent)' }: { strip: Strip; color?: string } = $props();

	const span = $derived(strip.max - strip.min);
	const pct = (v: number) => Math.max(0, Math.min(100, ((v - strip.min) / span) * 100));

	const TONE_ALPHA: Record<string, number> = { low: 0.10, lowmid: 0.16, mid: 0.24, high: 0.34 };
</script>

<div class="mt-3">
	<div class="relative h-7 rounded-lg overflow-hidden border hairline" style="background-color: var(--card);">
		{#each strip.segments as seg}
			<div
				class="absolute inset-y-0"
				style="left: {pct(seg.from)}%; width: {pct(seg.to) - pct(seg.from)}%; background-color: color-mix(in srgb, {color} {Math.round((TONE_ALPHA[seg.tone] ?? 0.2) * 100)}%, transparent); border-right: 1px solid var(--line);"
			></div>
		{/each}
		{#if strip.marks}
			{#each strip.marks as mark}
				<div class="absolute inset-y-0 w-px" style="left: {pct(mark.at)}%; background-color: var(--ink-3);" title={mark.label}></div>
			{/each}
		{/if}
		{#if strip.error}
			<div
				class="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full"
				style="left: {pct(strip.value - strip.error)}%; width: {pct(strip.value + strip.error) - pct(strip.value - strip.error)}%; background-color: color-mix(in srgb, {color} 45%, transparent);"
			></div>
		{/if}
		<div
			class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 shadow"
			style="left: {pct(strip.value)}%; background-color: {color}; border-color: var(--card);"
			title="{strip.valueLabel}"
		></div>
	</div>
	<div class="relative h-4 mt-1 text-[9px] font-bold uppercase tracking-wider t-ink3">
		{#each strip.segments as seg}
			{@const w = pct(seg.to) - pct(seg.from)}
			{#if w >= 12}
				<span class="absolute text-center overflow-hidden whitespace-nowrap" style="left: {pct(seg.from)}%; width: {w}%;">{seg.label}</span>
			{/if}
		{/each}
	</div>
	{#if strip.segments.some((s) => (pct(s.to) - pct(s.from)) < 12)}
		<div class="text-[9px] t-ink3 mt-0.5">
			{strip.segments.filter((s) => pct(s.to) - pct(s.from) < 12).map((s) => s.label).join(' · ')}
			<span class="opacity-60">(narrow bands, left edge)</span>
		</div>
	{/if}
	<div class="flex justify-between text-[10px] t-ink3 mt-1">
		<span>{strip.axisLabel}</span>
		<span class="font-bold tabular-nums" style="color: {color}">you: {strip.valueLabel}{strip.error ? ` ±${strip.error}` : ''}</span>
	</div>
</div>
