<script lang="ts">
  import { anchoredTo } from '$lib/platform/dom/anchored-popover';
  import type { PickerRow, TagPicker } from './tag-picker.svelte';

  type Props = {
    readonly picker: TagPicker;
    readonly anchor: HTMLElement | null;
    readonly onchoose: (row: PickerRow) => void;
    readonly onclose: () => void;
  };

  type Offer = {
    readonly id: string;
    readonly row: PickerRow;
    readonly selected: boolean;
  };

  let { picker, anchor, onchoose, onclose }: Props = $props();

  const uid = $props.id();

  let sheet = $state<HTMLDivElement | null>(null);
  let field = $state<HTMLInputElement | null>(null);

  const offers = $derived.by<readonly Offer[]>(() =>
    picker.rows.map((row, order) => ({
      id: `${uid}-row-${order}`,
      row,
      selected: order === picker.highlighted,
    })),
  );

  const active = $derived(offers[picker.highlighted]?.id);

  $effect(() => {
    const node = sheet;
    if (node === null) return;

    if (!node.matches(':popover-open')) node.showPopover();
    field?.focus();
  });

  function take(row: PickerRow | null): void {
    if (row === null) return;

    onchoose(row);
    field?.focus();
  }

  function keys(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      picker.moveBy(1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      picker.moveBy(-1);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      take(picker.chosen);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      onclose();
    }
  }

  function toggled(event: Event): void {
    if ((event as ToggleEvent).newState === 'closed') onclose();
  }
</script>

<div
  bind:this={sheet}
  class="sheet"
  popover="auto"
  role="dialog"
  aria-label="Add a tag"
  use:anchoredTo={() => anchor}
  ontoggle={toggled}
>
  <label class="assistive" for="{uid}-filter">Filter or create a tag</label>
  <input
    bind:this={field}
    bind:value={picker.query}
    id="{uid}-filter"
    class="filter"
    type="text"
    role="combobox"
    autocomplete="off"
    placeholder="Filter or create…"
    aria-expanded="true"
    aria-controls="{uid}-list"
    aria-activedescendant={active}
    onkeydown={keys}
  />

  <ul class="rows" id="{uid}-list" role="listbox" aria-label="Tags">
    {#each offers as offer (offer.id)}
      <li class="slot" role="presentation">
        {#if offer.row.kind === 'tag'}
          <button
            id={offer.id}
            class="row"
            class:at={offer.selected}
            type="button"
            role="option"
            tabindex="-1"
            aria-selected={offer.selected}
            style="--swatch: var(--c-tag-{offer.row.tag.colour})"
            onclick={() => take(offer.row)}
          >
            <span class="marker" aria-hidden="true">
              <span class="swatch"></span>
            </span>
            <span class="name">{offer.row.tag.name}</span>
            <span class="count">{offer.row.count}</span>
          </button>
        {:else}
          <button
            id={offer.id}
            class="row make"
            class:at={offer.selected}
            type="button"
            role="option"
            tabindex="-1"
            aria-selected={offer.selected}
            onclick={() => take(offer.row)}
          >
            <span class="marker" aria-hidden="true">
              <span class="sketch">+</span>
            </span>
            <span class="name">Create "{offer.row.name}"</span>
          </button>
        {/if}
      </li>
    {/each}
  </ul>

  <p class="hint">↵ add · esc done</p>
</div>

<style>
  .sheet {
    position: fixed;
    inset: auto;
    width: 258px;
    margin: 0;
    padding: var(--s-2);
    overflow: visible;
    border: 1px solid var(--c-border-8);
    border-radius: var(--r-6);
    background: var(--c-surface-popover);
    box-shadow: 0 22px 46px rgb(0 0 0 / 70%);
    color: var(--c-text-tag);
    font-family: var(--f-ui);
  }

  .filter {
    width: 100%;
    height: 28px;
    padding: 0 var(--s-2);
    border: 1px solid var(--c-border-3);
    border-radius: var(--r-2);
    background: var(--c-surface-chip);
    color: var(--c-text-3);
    font-family: var(--f-ui);
    font-size: 11.5px;
  }

  .filter::placeholder {
    color: var(--c-text-placeholder);
  }

  .filter:focus-visible {
    outline: none;
    border-color: var(--c-border-9);
  }

  .rows {
    display: flex;
    flex-direction: column;
    max-height: 214px;
    margin: var(--s-2) 0 0;
    padding: 0;
    overflow-y: auto;
    list-style: none;
  }

  .row {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    width: 100%;
    padding: var(--s-1) var(--s-2);
    border: 0;
    border-radius: var(--r-2);
    background: none;
    color: var(--c-text-tag);
    font-family: var(--f-ui);
    font-size: 11.5px;
    text-align: left;
    cursor: pointer;
  }

  .row.at {
    background: var(--c-surface-card-active);
  }

  .slot + .slot .make {
    margin-top: var(--s-1);
    padding-top: var(--s-2);
    border-top: 1px solid var(--c-border-1);
    border-radius: 0 0 var(--r-2) var(--r-2);
  }

  .marker {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 9px;
  }

  .swatch {
    width: 5px;
    height: 5px;
    border-radius: 1px;
    background: var(--swatch);
  }

  .sketch {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 9px;
    height: 9px;
    border: 1px dashed var(--c-border-9);
    border-radius: 1px;
    color: var(--c-text-9);
    font-size: 8px;
    line-height: 1;
  }

  .name {
    flex: 1 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .count {
    flex: none;
    color: var(--c-text-9);
    font-family: var(--f-mono);
    font-size: 10px;
  }

  .hint {
    margin: var(--s-2) 0 0;
    padding: 0 var(--s-2);
    color: var(--c-text-10);
    font-family: var(--f-mono);
    font-size: 9.5px;
    letter-spacing: 0.1em;
  }

  .assistive {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
