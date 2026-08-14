<script lang="ts">
	import { DIMS } from '$lib/quiz/questions';
	import { onDestroy } from 'svelte';
	import Chart from 'chart.js/auto';

	interface Props {
		ability: number[];
		usage: number[];
		error?: number[] | null;
	}
	let { ability, usage, error = null }: Props = $props();

	let canvas = $state<HTMLCanvasElement | null>(null);
	let chart: Chart | null = null;

	const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

	function hexToRgba(hex: string, alpha: number) {
		const h = hex.replace('#', '');
		const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
		return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
	}

	function render() {
		if (!canvas) return;
		const t = {
			grid: cssVar('--line-2'),
			labels: DIMS.map((d, i) => cssVar(`--dim-${i}`)),
			ability: cssVar('--ability'),
			usage: cssVar('--usage'),
			card: cssVar('--card'),
			ink2: cssVar('--ink-2'),
			ink: cssVar('--ink')
		};
		if (chart) chart.destroy();
		const clamp01 = (v: number) => Math.max(0, Math.min(100, v));
		const bandDatasets = error
			? [
					{
						label: '_band_hi',
						data: ability.map((v, i) => clamp01(v + error![i])),
						borderWidth: 0, pointRadius: 0, pointHitRadius: 0, fill: false,
						backgroundColor: 'transparent'
					},
					{
						label: '_band_lo',
						data: ability.map((v, i) => clamp01(v - error![i])),
						borderWidth: 0, pointRadius: 0, pointHitRadius: 0,
						fill: '-1',
						backgroundColor: hexToRgba(t.ability, 0.14)
					}
				]
			: [];

		chart = new Chart(canvas.getContext('2d')!, {
			type: 'radar',
			data: {
				labels: DIMS.map((d) => d.key),
				datasets: [
					...bandDatasets,
					{
						// spread: Chart.js defineProperty()s on its data arrays, which a $state proxy forbids
						label: 'Ability', data: [...ability],
						backgroundColor: hexToRgba(t.ability, 0.06),
						borderColor: t.ability, pointBackgroundColor: t.card, pointBorderColor: t.ability,
						pointBorderWidth: 2, pointRadius: 4, borderWidth: 2.5
					},
					{
						label: 'Usage', data: [...usage],
						backgroundColor: hexToRgba(t.usage, 0.1),
						borderColor: t.usage, borderDash: [6, 4],
						pointBackgroundColor: t.card, pointBorderColor: t.usage, pointStyle: 'rect',
						pointBorderWidth: 2, pointRadius: 4, borderWidth: 2.5
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: true,
				scales: {
					r: {
						min: 0, max: 100,
						angleLines: { color: hexToRgba(t.grid.startsWith('#') ? t.grid : '#94a3b8', 0.5) },
						grid: { color: hexToRgba(t.grid.startsWith('#') ? t.grid : '#94a3b8', 0.5), circular: true },
						pointLabels: { font: { family: 'Inter Variable', size: 13, weight: 600 }, color: (ctx: { index: number }) => t.labels[ctx.index] },
						ticks: { display: false, stepSize: 20 }
					}
				},
				plugins: {
					legend: {
						display: true, position: 'bottom',
						labels: {
							font: { family: 'Inter Variable', size: 12, weight: 500 },
							color: t.ink2, usePointStyle: true, padding: 20,
							filter: (item) => !(item.text ?? '').startsWith('_')
						}
					},
					tooltip: {
						backgroundColor: hexToRgba(t.ink, 0.92), padding: 12,
						filter: (item) => !(item.dataset.label ?? '').startsWith('_'),
						callbacks: { label: (c) => ` ${c.dataset.label}: ${c.raw}` }
					}
				}
			}
		});
	}

	$effect(() => {
		void ability; void usage; void error; void canvas;
		render();
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const onChange = () => render();
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	});

	onDestroy(() => chart && chart.destroy());
</script>

<div class="mp-radar relative w-full max-w-md mx-auto aspect-square">
	<canvas bind:this={canvas}></canvas>
</div>
