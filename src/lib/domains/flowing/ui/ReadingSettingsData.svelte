<script lang="ts">
  import type { Snippet } from 'svelte';
  import ReaderFrame from '$lib/shared/ReaderFrame.svelte';
  import { ReaderFrameView } from '$lib/shared/reader-frame.svelte';
  import { readQuery } from '$lib/shared/read-query.svelte';
  import type { ReadingSettings } from '../domain/reading-settings';
  import { readingSettingsQuery } from '../queries/flowing-queries';
  import type { FlowingReads } from '../queries/flowing-queries';
  import FlowCurtain from './FlowCurtain.svelte';
  import { openingSettings } from './opening-settings';

  type Props = {
    readonly flowing: FlowingReads;
    readonly panel?: Snippet<[boolean]>;
    readonly panelCount?: number;
    readonly children: Snippet<[ReadingSettings]>;
  };

  let { flowing, panel, panelCount, children }: Props = $props();

  const stored = readQuery(() => readingSettingsQuery(flowing));
  const opening = $derived(openingSettings(stored.state));
  const frame = new ReaderFrameView();
</script>

{#if opening.kind === 'read'}
  {@render children(opening.settings)}
{:else}
  <ReaderFrame
    {frame}
    shown={frame.barsShown}
    class="flow-viewer"
    pageClass="layout-overlay-bare"
    {panel}
    {panelCount}
  >
    {#snippet page()}{/snippet}
    {#snippet header()}{/snippet}
    {#snippet footer()}{/snippet}
    {#snippet overlay()}
      <FlowCurtain curtain={{ kind: 'opening' }} />
    {/snippet}
  </ReaderFrame>
{/if}
