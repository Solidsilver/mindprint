<script lang="ts">
	import { DIMS } from '$lib/quiz/questions';
	import { onDestroy } from 'svelte';
	import Chart from 'chart.js/auto';
	import type { PointStyle } from 'chart.js';

	// max 4 traces (colorblind-safe cap)
	interface Person {
		n: string;
		a: number[];
		u: number[];
	}
	let { people }: { people: Person[] } = $props();

	const PERSON_STYLES: PointStyle[] = ['circle', 'rect', 'triangle', 'rectRot'];
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
			card: cssVar('--card'),
			ink2: cssVar('--ink-2'),
			ink: cssVar('--ink')
		};
		if (chart) chart.destroy();
		chart = new Chart(canvas.getContext('2d')!, {
			type: 'radar',
			data: {
				labels: DIMS.map((d) => d.key),
				datasets: people.slice(0, 4).map((p, i) => {
					const color = cssVar(`--p-${i}`);
					return {
						label: p.n,
						data: p.a.map((av, j) => Math.round((av + p.u[j]) / 2)),
						backgroundColor: hexToRgba(color, 0.1),
						borderColor: color,
						pointBackgroundColor: t.card,
						pointBorderColor: color,
						pointStyle: PERSON_STYLES[i],
						pointBorderWidth: 2,
						pointRadius: 5,
						borderWidth: 2.5
					};
				})
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
						display: people.length > 0, position: 'bottom',
						labels: { font: { family: 'Inter Variable', size: 12, weight: 500 }, color: t.ink2, usePointStyle: true, padding: 16 }
					},
					tooltip: {
						backgroundColor: hexToRgba(t.ink, 0.92), padding: 12,
						callbacks: { label: (c) => ` ${c.dataset.label}: ${c.raw}` }
					}
				}
			}
		});
	}

	$effect(() => {
		void people; void canvas;
		render();
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const onChange = () => render();
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	});

	onDestroy(() => chart && chart.destroy());
</script>

<div class="relative w-full max-w-md mx-auto aspect-square">
	<canvas bind:this={canvas}></canvas>
</div>
