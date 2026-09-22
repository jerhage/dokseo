<script lang="ts">
  import { CONTENTS_LABEL, entryLabel, indentDepth } from './flow-contents';
  import type { ContentsEntry } from './flow-contents';

  type Props = {
    readonly entries: readonly ContentsEntry[];
    readonly currentKey: string | null;
    readonly onpick: (entry: ContentsEntry) => void;
    readonly onclose: () => void;
  };

  const { entries, currentKey, onpick, onclose }: Props = $props();

  const uid = $props.id();

  let dialog = $state<HTMLDialogElement | null>(null);
  let dismissed = false;

  $effect(() => {
    const node = dialog;
    if (node === null || node.open) return;

    node.showModal();
    const here = node.querySelector('[aria-current="true"]');
    if (here instanceof HTMLElement) {
      here.focus();
      here.scrollIntoView({ block: 'center' });
    }
  });

  function dismiss(): void {
    if (dismissed) return;
    dismissed = true;
    onclose();
  }

  function backdrop(event: MouseEvent): void {
    if (event.target === dialog) dialog?.close();
  }

  function pick(entry: ContentsEntry): void {
    onpick(entry);
    dialog?.close();
  }
</script>

<dialog bind:this={dialog} aria-labelledby="{uid}-heading" onclick={backdrop} onclose={dismiss}>
  <div class="panel">
    <div class="head">
      <h2 class="heading" id="{uid}-heading">{CONTENTS_LABEL}</h2>
      <button class="close" type="button" onclick={() => dialog?.close()}>Close</button>
    </div>

    <ul class="list">
      {#each entries as entry (entry.key)}
        <li class="row" style:--depth={indentDepth(entry.depth)}>
          {#if entry.kind === 'link'}
            <button
              class="entry link"
              class:current={entry.key === currentKey}
              class:unnamed={entry.label === null}
              type="button"
              aria-current={entry.key === currentKey ? 'true' : undefined}
              onclick={() => pick(entry)}
            >
              {entryLabel(entry)}
            </button>
          {:else}
            <p class="entry group">{entry.label}</p>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
</dialog>

<style>
  dialog {
    width: min(420px, calc(100% - var(--s-5)));
    max-height: 78vh;
    margin: auto;
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--c-border-3);
    border-radius: var(--r-7);
    background: var(--c-surface-popover);
    color: var(--c-text-2);
  }

  dialog::backdrop {
    background: color-mix(in srgb, var(--c-surface-void) 72%, transparent);
  }

  .panel {
    display: flex;
    flex-direction: column;
    max-height: 78vh;
    font-family: var(--f-ui);
  }

  .head {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-3);
    padding: var(--s-4) var(--s-5) var(--s-3);
    border-bottom: 1px solid var(--c-border-1);
  }

  .heading {
    margin: 0;
    color: var(--c-text-1);
    font-size: 15px;
    font-weight: 500;
  }

  .close {
    padding: var(--s-1) var(--s-3);
    border: 1px solid var(--c-border-4);
    border-radius: var(--r-4);
    background: var(--c-surface-button);
    color: var(--c-text-5);
    font-family: var(--f-ui);
    font-size: 12px;
    cursor: pointer;
  }

  .close:hover,
  .close:focus-visible {
    border-color: var(--c-accent-border);
    color: var(--c-accent);
  }

  .list {
    flex: 1 1 auto;
    margin: 0;
    padding: var(--s-2) var(--s-3) var(--s-4);
    overflow-y: auto;
    list-style: none;
  }

  .row {
    padding-inline-start: calc(var(--s-4) * var(--depth));
  }

  .entry {
    display: block;
    width: 100%;
    margin: 0;
    padding: var(--s-2) var(--s-3);
    border: 0;
    border-radius: var(--r-4);
    background: none;
    font-family: var(--f-ja);
    font-size: 12.5px;
    line-height: 1.4;
    text-align: start;
  }

  .link {
    color: var(--c-text-3);
    cursor: pointer;
  }

  .link:hover,
  .link:focus-visible {
    background: var(--c-surface-chip);
    color: var(--c-text-1);
  }

  .link.current {
    background: var(--c-surface-chip);
    color: var(--c-accent);
    font-weight: 600;
  }

  .link.unnamed {
    color: var(--c-text-8);
    font-family: var(--f-ui);
    font-style: italic;
  }

  .group {
    color: var(--c-text-6);
    font-size: 11px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
</style>
