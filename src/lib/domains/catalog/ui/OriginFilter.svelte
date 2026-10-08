<script lang="ts">
  import Field from '$lib/ui/components/Field.svelte';
  import Select from '$lib/ui/components/Select.svelte';
  import { FILTER_LABEL } from './origin-filter';
  import type { OriginFilterView } from './origin-filter.svelte';

  type Props = { readonly view: OriginFilterView };

  let { view }: Props = $props();
</script>

<Field label={FILTER_LABEL} layout="inline">
  {#snippet children(control)}
    <Select {...control} bind:value={() => view.value, (value) => view.choose(value)}>
      {#each view.options as option (option.value)}
        <option value={option.value}>{option.label}</option>
      {/each}
    </Select>
  {/snippet}
</Field>
