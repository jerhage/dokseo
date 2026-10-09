<script lang="ts">
  import Field from '$lib/ui/components/Field.svelte';
  import Select from '$lib/ui/components/Select.svelte';
  import type { Catalog } from '../domain/catalog';
  import { FILTER_LABEL, filterOptions, filterValue, shownFilter } from './origin-filter';
  import type { createOriginFilter } from './origin-filter.svelte';

  type Props = {
    readonly catalogs: readonly Catalog[];
    readonly filter: ReturnType<typeof createOriginFilter>;
  };

  let { catalogs, filter }: Props = $props();

  const options = $derived(filterOptions(catalogs));
  const value = $derived(filterValue(shownFilter(filter.chosen, catalogs)));
</script>

<Field label={FILTER_LABEL} layout="inline">
  {#snippet children(control)}
    <Select {...control} bind:value={() => value, (next) => filter.choose(next, catalogs)}>
      {#each options as option (option.value)}
        <option value={option.value}>{option.label}</option>
      {/each}
    </Select>
  {/snippet}
</Field>
