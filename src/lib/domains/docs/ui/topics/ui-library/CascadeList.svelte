<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import { formatSpecificity } from '../../../domain/cascade';
  import type { CascadeEntry } from '../../../domain/cascade';

  type Props = {
    property: string;
    entries: readonly CascadeEntry[];
    computed: string;
  };

  let { property, entries, computed }: Props = $props();

  const ranked = $derived(entries.toReversed());
</script>

<div class="stack-sm">
  <p class="row wrap items-center gap-2 m-0">
    <code>{property}</code>
    <span class="text-sm text-muted">computes to</span>
    <code>{computed}</code>
  </p>
  <ol class="list-reset stack-sm">
    {#each ranked as entry, index (entry.order)}
      <li class="row wrap items-center gap-2 text-sm">
        <Badge
          variant={index === 0 ? 'success' : 'neutral'}
          emphasis={index === 0 ? 'solid' : 'tinted'}>{index === 0 ? 'wins' : 'loses'}</Badge
        >
        <Badge variant="accent">{entry.layer ?? 'unlayered'}</Badge>
        <code>{entry.selector}</code>
        <span class="text-faint">{formatSpecificity(entry.specificity)}</span>
        <code>{entry.value}</code>
      </li>
    {/each}
  </ol>
</div>
