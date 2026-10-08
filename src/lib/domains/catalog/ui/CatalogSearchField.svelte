<script lang="ts">
  import { match } from 'ts-pattern';
  import SearchField from '$lib/ui/components/SearchField.svelte';
  import { searchFieldKey } from './catalog-search';
  import type { HeaderField } from './catalog-search';

  type Props = { readonly field: HeaderField };

  let { field }: Props = $props();

  function keys(event: KeyboardEvent): void {
    match(searchFieldKey(event, field.value))
      .with('submit', () => {
        event.preventDefault();
        field.onsubmit(field.value);
      })
      .with('clear', () => {
        event.preventDefault();
        field.oninput('');
      })
      .with('ignore', () => {})
      .exhaustive();
  }
</script>

<div class="row items-center layout-app-shell-narrow-only" role="search">
  <SearchField
    bind:value={() => field.value, (next) => field.oninput(next)}
    label={field.placeholder}
    hideLabel
    class="flex-1"
    placeholder={field.placeholder}
    disabled={field.disabled}
    onkeydown={keys}
  />
</div>
