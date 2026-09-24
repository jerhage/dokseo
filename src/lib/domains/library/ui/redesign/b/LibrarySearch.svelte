<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import { clearsSearch, isSearching } from '../library-overview';

  type Props = {
    query?: string;
    readonly matched: string;
  };

  let { query = $bindable(''), matched }: Props = $props();

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
    if (!clearsSearch(event.key, query)) return;
    event.preventDefault();
    abandon();
  }
</script>

<div class="row items-center gap-2 flex-1" role="search">
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
    <Button size="sm" variant="ghost" onclick={abandon}>esc</Button>
  {/if}
</div>
