<script lang="ts">
  import type { Snippet } from 'svelte';
  import { readQuery } from '$lib/shared/read-query.svelte';
  import type { ReadingSettings } from '../domain/reading-settings';
  import { readingSettingsQuery } from '../queries/flowing-queries';
  import type { FlowingReads } from '../queries/flowing-queries';
  import { openingSettings } from './opening-settings';

  type Props = {
    readonly flowing: FlowingReads;
    readonly children: Snippet<[ReadingSettings]>;
  };

  let { flowing, children }: Props = $props();

  const stored = readQuery(() => readingSettingsQuery(flowing));
  const opening = $derived(openingSettings(stored.state));
</script>

{#if opening.kind === 'read'}
  {@render children(opening.settings)}
{/if}
