<script lang="ts">
  import type { HighlightSegment } from './highlight';

  type Props = {
    segments: readonly HighlightSegment[];
  };

  let { segments }: Props = $props();
</script>

{#each segments as segment, part (part)}{#if segment.matched}<mark>{segment.text}</mark
    >{:else}{segment.text}{/if}{/each}
