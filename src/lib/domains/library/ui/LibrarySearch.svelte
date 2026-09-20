<script lang="ts">
  type Props = {
    query?: string;
    readonly matched: string | null;
    readonly label: string;
  };

  let { query = $bindable(''), matched, label }: Props = $props();

  let field = $state<HTMLInputElement | null>(null);

  const active = $derived(query.trim().length > 0);

  function abandon(): void {
    query = '';
    field?.focus();
  }

  function keys(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || query.length === 0) return;
    event.preventDefault();
    abandon();
  }
</script>

<div class="search" class:active>
  <span class="lens" aria-hidden="true"></span>
  <label class="assistive" for="library-search">{label}</label>
  <input
    bind:this={field}
    id="library-search"
    type="search"
    bind:value={query}
    placeholder={label}
    onkeydown={keys}
  />
  {#if matched !== null && active}
    <span class="matched" role="status">{matched}</span>
  {/if}
  <button class="esc" type="button" disabled={!active} onclick={abandon}>esc</button>
</div>

<style>
  .search {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    width: 470px;
    max-width: 100%;
    height: 38px;
    padding: 0 var(--s-3);
    border: 1px solid var(--c-border-3);
    border-radius: var(--r-5);
    background: var(--c-surface-popover);
    font-family: var(--f-ui);
  }

  .search.active,
  .search:focus-within {
    border-color: var(--c-accent-line);
  }

  .lens {
    flex: none;
    width: 13px;
    height: 13px;
    border: 2px solid var(--c-accent);
    border-radius: 50%;
  }

  input {
    flex: 1 1 auto;
    min-width: 0;
    height: 100%;
    padding: 0;
    border: 0;
    background: none;
    color: var(--c-text-1);
    font-family: var(--f-ui);
    font-size: 14px;
  }

  input::placeholder {
    color: var(--c-text-10);
  }

  input:focus-visible {
    outline: none;
  }

  .matched {
    flex: none;
    color: var(--c-text-7);
    font-family: var(--f-mono);
    font-size: 10.5px;
    white-space: nowrap;
  }

  .esc {
    flex: none;
    padding: 3px var(--s-2);
    border: 0;
    border-radius: var(--r-1);
    background: var(--c-surface-button);
    color: var(--c-text-7);
    font-family: var(--f-mono);
    font-size: 10px;
    cursor: pointer;
  }

  .esc:disabled {
    cursor: default;
    opacity: 0.45;
  }

  .esc:hover:not(:disabled),
  .esc:focus-visible {
    color: var(--c-accent);
  }

  .assistive {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
