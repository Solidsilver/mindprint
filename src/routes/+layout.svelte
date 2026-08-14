<script lang="ts">
	import '@fontsource-variable/inter';
	import '@fontsource-variable/newsreader/wght-italic.css';
	import '../app.css';
	import { toast } from '$lib/toast.svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="min-h-screen flex items-start sm:items-center justify-center p-4 sm:p-8">
	<div class="w-full max-w-2xl surface rounded-3xl overflow-hidden relative border hairline my-4" style="box-shadow: var(--shadow);">
		<div
			class="fixed top-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-xl transition-opacity duration-300 z-50 font-medium flex items-center gap-2 text-white {toast.visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}"
			style="background-color: {toast.error ? 'var(--bad)' : 'var(--ink)'};"
			role="status"
		>
			<svg class="w-5 h-5" style="color: {toast.error ? '#fff' : 'var(--good)'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
			<span>{toast.msg}</span>
		</div>
		{@render children()}
	</div>
</div>
