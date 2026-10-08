<script lang="ts">
  import { match } from 'ts-pattern';
  import SearchField from '$lib/ui/components/SearchField.svelte';
  import { filterKey } from './library-overview';

  type Props = { query?: string };

  let { query = $bindable('') }: Props = $props();

  const LABEL = 'Filter these titles';

  function keys(event: KeyboardEvent): void {
    match(filterKey(event, query))
      .with('clear', () => {
        event.preventDefault();
        query = '';
      })
      .with('ignore', () => {})
      .exhaustive();
  }
</script>

<div class="row items-center layout-app-shell-narrow-only" role="search">
  <SearchField
    bind:value={query}
    label={LABEL}
    hideLabel
    class="flex-1"
    placeholder={LABEL}
    onkeydown={keys}
  />
</div>
