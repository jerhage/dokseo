<script lang="ts">
  import { match } from 'ts-pattern';
  import type { ClassValue } from 'svelte/elements';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import { filterKey, isSearching } from './library-overview';

  type Props = {
    query?: string;
    readonly matched: string;
    readonly class?: ClassValue;
  };

  let { query = $bindable(''), matched, class: className }: Props = $props();

  const uid = $props.id();
  const fieldId = `${uid}-search`;
  const LABEL = 'Filter these titles';

  let field = $state<HTMLInputElement>();

  const active = $derived(isSearching(query));

  function abandon(): void {
    query = '';
    field?.focus();
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
  <label class="visually-hidden" for={fieldId}>{LABEL}</label>
  <Input
    bind:ref={field}
    id={fieldId}
    class="flex-1"
    type="search"
    bind:value={query}
    placeholder={LABEL}
    onkeydown={keys}
  />
  {#if active}
    <span class="text-xs mono text-muted" role="status">{matched}</span>
    <Button size="sm" variant="ghost" class="layout-app-shell-wide-only" onclick={abandon}
      >esc</Button
    >
  {/if}
</div>
