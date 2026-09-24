<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import { clearsSearch, isSearching } from '../library-overview';

  type Props = {
    query?: string;
    readonly matched: string | null;
    readonly label: string;
  };

  let { query = $bindable(''), matched, label }: Props = $props();

  const uid = $props.id();
  const fieldId = `${uid}-search`;

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

<div class="row items-center gap-2">
  <label class="visually-hidden" for={fieldId}>{label}</label>
  <Input
    bind:ref={field}
    id={fieldId}
    type="search"
    bind:value={query}
    placeholder={label}
    onkeydown={keys}
  />
  {#if matched !== null && active}
    <span class="text-xs mono text-muted" role="status">{matched}</span>
  {/if}
  <Button size="sm" variant="ghost" disabled={!active} onclick={abandon}>esc</Button>
</div>
