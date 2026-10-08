<script lang="ts">
  import { match } from 'ts-pattern';
  import type { ClassValue } from 'svelte/elements';
  import Button from '$lib/ui/components/Button.svelte';
  import SearchField from '$lib/ui/components/SearchField.svelte';
  import { filterKey, headerFieldKey, isSearching } from './library-overview';
  import type { HeaderSearch } from './library-overview';

  type Props = {
    query?: string;
    readonly matched: string;
    readonly class?: ClassValue;
    readonly headerSearch?: HeaderSearch | undefined;
  };

  let { query = $bindable(''), matched, class: className, headerSearch }: Props = $props();

  const LABEL = 'Filter these titles';

  let field = $state<HTMLInputElement | null>();

  const active = $derived(isSearching(query));

  function abandon(): void {
    query = '';
    field?.focus();
  }

  function headerKeys(event: KeyboardEvent, header: HeaderSearch): void {
    match(headerFieldKey(event, header.value))
      .with('submit', () => {
        event.preventDefault();
        header.onsubmit(header.value);
      })
      .with('clear', () => {
        event.preventDefault();
        header.oninput('');
      })
      .with('ignore', () => {})
      .exhaustive();
  }

  function keys(event: KeyboardEvent): void {
    match(filterKey(event, query))
      .with('clear', () => {
        event.preventDefault();
        abandon();
      })
      .with('ignore', () => {})
      .exhaustive();
  }
</script>

<div class={['row items-center gap-2 flex-fill', className]} role="search">
  {#if headerSearch !== undefined}
    <SearchField
      bind:value={() => headerSearch.value, (next) => headerSearch.oninput(next)}
      label={headerSearch.placeholder}
      hideLabel
      class="flex-1"
      placeholder={headerSearch.placeholder}
      disabled={headerSearch.disabled}
      onkeydown={(event) => headerKeys(event, headerSearch)}
    />
  {:else}
    <SearchField
      bind:ref={field}
      bind:value={query}
      label={LABEL}
      hideLabel
      class="flex-1"
      placeholder={LABEL}
      onkeydown={keys}
    />
    {#if active}
      <span class="text-xs mono text-muted" role="status">{matched}</span>
      <Button size="sm" variant="ghost" class="layout-app-shell-wide-only" onclick={abandon}
        >esc</Button
      >
    {/if}
  {/if}
</div>
