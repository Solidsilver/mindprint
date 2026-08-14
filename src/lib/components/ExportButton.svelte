<script lang="ts">
	import { DIMS, TIER_INFO } from '$lib/quiz/questions';
	import { generateProfile } from '$lib/quiz/profile';
	import { showToast } from '$lib/toast.svelte';
	import type { Profile } from '$lib/quiz/types';

	interface Props {
		profile: Profile;
		getCanvas: () => HTMLCanvasElement | null;
	}
	let { profile, getCanvas }: Props = $props();

	let busy = $state(false);

	const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

	function wrapText(
		context: CanvasRenderingContext2D,
		text: string,
		x: number,
		y: number,
		maxWidth: number,
		lineHeight: number
	) {
		const words = text.split(' ');
		let line = '';
		for (let n = 0; n < words.length; n++) {
			const testLine = line + words[n] + ' ';
			if (context.measureText(testLine).width > maxWidth && n > 0) {
				context.fillText(line, x, y);
				line = words[n] + ' ';
				y += lineHeight;
			} else {
				line = testLine;
			}
		}
		context.fillText(line, x, y);
		return y;
	}

	async function exportImage() {
		busy = true;
		try {
			await document.fonts.ready;
			await new Promise((r) => setTimeout(r, 50));

			const A = Object.fromEntries(DIMS.map((d, i) => [d.key, profile.a[i]]));
			const U = Object.fromEntries(DIMS.map((d, i) => [d.key, profile.u[i]]));
			const fallback = generateProfile(A, U);
			// export whatever is on screen (LLM narrative may have replaced the deterministic text)
			const title = (document.getElementById('profile-title') as HTMLElement | null)?.innerText || fallback.title;
			const desc = (document.getElementById('profile-desc') as HTMLElement | null)?.innerText || fallback.desc;

			const canvas = document.createElement('canvas');
			canvas.width = 800;
			canvas.height = 1000;
			const ctx = canvas.getContext('2d');
			if (!ctx) throw new Error('no 2d context');

			ctx.fillStyle = cssVar('--page');
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			ctx.fillStyle = cssVar('--ink-3');
			ctx.font = 'bold 15px "Inter Variable", sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText((profile.n ? profile.n.toUpperCase() + "'S " : '') + 'MINDPRINT', 400, 58);

			ctx.fillStyle = cssVar('--accent');
			ctx.font = 'italic 600 46px "Newsreader Variable", Georgia, serif';
			ctx.fillText(title, 400, 112);

			const eArr = profile.e || [13, 13, 13, 13];
			const avgE = Math.round(eArr.reduce((x, y) => x + y, 0) / 4);
			ctx.fillStyle = cssVar('--ink-3');
			ctx.font = '13px "Inter Variable", sans-serif';
			const bits = [];
			if (profile.h > 1) bits.push(`averaged across ${profile.h} sittings`);
			else if (profile.t && TIER_INFO[profile.t]) bits.push(`${TIER_INFO[profile.t].label} sitting`);
			bits.push(`typical error ±${avgE} per channel`);
			ctx.fillText(bits.join(' · '), 400, 138);

			const chartCanvas = getCanvas();
			if (chartCanvas) ctx.drawImage(chartCanvas, 150, 155, 500, 500);

			ctx.fillStyle = cssVar('--card');
			ctx.beginPath();
			ctx.roundRect(80, 695, 640, 205, 16);
			ctx.fill();
			ctx.lineWidth = 1.5;
			ctx.strokeStyle = cssVar('--line');
			ctx.stroke();

			ctx.fillStyle = cssVar('--ink-2');
			ctx.font = '20px "Inter Variable", sans-serif';
			wrapText(ctx, desc, 400, 742, 580, 30);

			ctx.fillStyle = cssVar('--ink-3');
			ctx.font = '13px "Inter Variable", sans-serif';
			ctx.fillText('Mindprint — for fun, not diagnosis', 400, 965);

			canvas.toBlob(async (blob) => {
				if (!blob) {
					showToast("Couldn't export the image.", true);
					busy = false;
					return;
				}
				try {
					const item = new ClipboardItem({ 'image/png': blob });
					await navigator.clipboard.write([item]);
					showToast('Image copied to clipboard!');
				} catch (clipErr) {
					try {
						const url = URL.createObjectURL(blob);
						const a = document.createElement('a');
						a.href = url;
						a.download = `Mindprint-${title.replace(/\s+/g, '-')}.png`;
						document.body.appendChild(a);
						a.click();
						document.body.removeChild(a);
						URL.revokeObjectURL(url);
						showToast('Image downloaded!');
					} catch (dlErr) {
						showToast("Couldn't export the image.", true);
					}
				} finally {
					busy = false;
				}
			}, 'image/png');
		} catch (err) {
			console.error('Export failed:', err);
			showToast("Couldn't generate the image.", true);
			busy = false;
		}
	}
</script>

<button onclick={exportImage} disabled={busy} class="flex-1 px-6 py-4 btn-primary font-semibold rounded-xl flex justify-center items-center gap-2">
	{#if busy}
		<svg class="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
		Generating…
	{:else}
		<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
		Save / copy image
	{/if}
</button>
