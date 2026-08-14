<script lang="ts">
	import ResultsView from '$lib/components/ResultsView.svelte';
	import CompareRadar from '$lib/components/CompareRadar.svelte';
	import { loadHistory, profileFromHistory, getName } from '$lib/quiz/storage';
	import { DIMS } from '$lib/quiz/questions';
	import { onMount } from 'svelte';
	import type { Profile } from '$lib/quiz/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let mine = $state<Profile | null>(null);
	let overlay = $state(false);

	onMount(() => {
		const history = loadHistory();
		mine = profileFromHistory(history, getName());
	});

	const people = $derived(
		mine ? [{ ...mine, n: mine.n || 'You' }, { ...data.profile, n: data.profile.n || 'Them' }] : []
	);
</script>

<svelte:head>
	<title>{data.ogTitle}</title>
	<meta property="og:title" content={data.ogTitle} />
	<meta property="og:description" content="A field guide to the inner world — visual, verbal, spatial, and kinesthetic thinking mapped." />
	<meta property="og:image" content={data.ogImage} />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content={data.ogImage} />
</svelte:head>

<div class="p-8 sm:p-12">
	<div class="mb-6 p-4 rounded-2xl text-sm font-medium text-center" style="background-color: var(--accent-soft); color: var(--accent);">
		You're looking at <strong>{data.profile.n || 'someone'}'s</strong> Mindprint.
		<a href="/" class="underline font-bold">Take it yourself</a>
		{#if mine}
			· <button class="underline font-bold" onclick={() => (overlay = !overlay)}>{overlay ? 'Hide overlay' : 'Compare with yours'}</button>
		{/if}
	</div>

	{#if overlay && mine}
		<div class="mb-8 fade-enter">
			<h4 class="text-xs font-bold tracking-[0.2em] t-ink3 uppercase mb-4 text-center">Overall scores, overlaid</h4>
			<CompareRadar {people} />
			<div class="overflow-x-auto mt-4">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b hairline-2">
							<th class="text-left py-2 pr-3 t-ink3 text-xs font-bold uppercase tracking-widest">Channel</th>
							{#each people as p, i}
								<th class="text-right py-2 px-3 text-xs font-bold">
									<span class="inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full" style="background-color: var(--p-{i})"></span>{p.n}</span>
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each DIMS as d, j}
							<tr class="border-b hairline">
								<td class="py-2.5 pr-3 font-semibold t-ink">{d.key}</td>
								{#each people as p}
									<td class="text-right py-2.5 px-3 tabular-nums t-ink">
										{Math.round((p.a[j] + p.u[j]) / 2)} <span class="t-ink3 text-xs">({p.a[j]}/{p.u[j]})</span>
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<ResultsView profile={data.profile} viewingShared={true} />
</div>
