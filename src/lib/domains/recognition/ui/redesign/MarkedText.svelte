<script lang="ts">
  import type { TextSegment } from '$lib/shared/text-search';

  type Props = {
    readonly segments: readonly TextSegment[];
  };

  let { segments }: Props = $props();
</script>

{#each segments as segment, part (part)}{#if segment.matched}<mark>{segment.text}</mark
    >{:else}{segment.text}{/if}{/each}
