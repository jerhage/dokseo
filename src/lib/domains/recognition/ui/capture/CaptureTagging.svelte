<script lang="ts">
  import { tick } from 'svelte';
  import type { CaptureId } from '$lib/shared/ids';
  import type { TagChip } from './tag-chip';
  import type { TagSelection } from './tag-selection.svelte';
  import CaptureTags from './CaptureTags.svelte';
  import TagPickerPopover from './TagPickerPopover.svelte';

  type Props = {
    readonly selection: TagSelection;
    readonly capture: CaptureId;
    readonly chips: readonly TagChip[];
    readonly place: string;
  };

  let { selection, capture, chips, place }: Props = $props();

  let trigger = $state<HTMLButtonElement | null>(null);

  function open(from: HTMLButtonElement): void {
    trigger = from;
    selection.open(capture);
  }

  async function close(): Promise<void> {
    selection.close();
    await tick();
    trigger?.focus();
    trigger = null;
  }
</script>

<CaptureTags
  {chips}
  {place}
  onremove={(tag) => void selection.drop(capture, tag)}
  onadd={(from) => open(from)}
/>
{#if selection.opened(capture)}
  <TagPickerPopover
    picker={selection.picker}
    anchor={trigger}
    onchoose={(row) => void selection.choose(row)}
    onclose={() => void close()}
  />
{/if}
