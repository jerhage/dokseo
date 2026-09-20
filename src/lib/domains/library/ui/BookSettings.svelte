<script lang="ts">
  import { untrack } from 'svelte';
  import {
    PAGE_PAIRING_CHOICES,
    PAGE_PAIRING_LEGEND,
    READING_DIRECTION_CHOICES,
    READING_DIRECTION_LEGEND,
  } from '$lib/shared/layout-choices';
  import type { Book, BookEdit } from '../domain/book/book';
  import { bookForm, changedFields } from './book-edit-form';

  type Props = {
    readonly book: Book;
    readonly saving: boolean;
    readonly onsave: (edit: BookEdit) => void;
    readonly onclose: () => void;
  };

  let { book, saving, onsave, onclose }: Props = $props();

  const uid = $props.id();

  let dialog = $state<HTMLDialogElement | null>(null);
  let form = $state(untrack(() => bookForm(book)));
  let dismissed = false;

  const downward = $derived(form.layoutKind === 'continuous');

  $effect(() => {
    const node = dialog;
    if (node === null || node.open) return;
    node.showModal();
  });

  function dismiss(): void {
    if (dismissed) return;
    dismissed = true;
    onclose();
  }

  function requestClose(): void {
    if (saving) return;
    dialog?.close();
  }

  function backdrop(event: MouseEvent): void {
    if (event.target === dialog) requestClose();
  }

  function submit(event: SubmitEvent): void {
    event.preventDefault();
    if (saving) return;
    onsave(changedFields(book, form));
  }
</script>

<dialog
  bind:this={dialog}
  aria-labelledby="{uid}-heading"
  onclick={backdrop}
  onclose={dismiss}
  oncancel={(event) => {
    if (saving) event.preventDefault();
  }}
>
  <form class="panel" onsubmit={submit}>
    <h2 class="heading" id="{uid}-heading">Book settings</h2>

    <label class="field" for="{uid}-title">
      <span class="label">Title</span>
      <input
        id="{uid}-title"
        class="text"
        class:ko={form.language === 'ko'}
        type="text"
        lang={form.language}
        autocomplete="off"
        disabled={saving}
        bind:value={form.title}
      />
    </label>

    <fieldset class="group" disabled={saving}>
      <legend class="label">Language</legend>
      <label class="choice">
        <input type="radio" name="{uid}-language" value="ja" bind:group={form.language} />
        <span>Japanese</span>
      </label>
      <label class="choice">
        <input type="radio" name="{uid}-language" value="ko" bind:group={form.language} />
        <span>Korean</span>
      </label>
    </fieldset>

    <fieldset class="group" disabled={saving}>
      <legend class="label">Layout</legend>
      <label class="choice">
        <input type="radio" name="{uid}-layout" value="paged" bind:group={form.layoutKind} />
        <span>Pages</span>
      </label>
      <label class="choice">
        <input type="radio" name="{uid}-layout" value="continuous" bind:group={form.layoutKind} />
        <span>Continuous strip</span>
      </label>
    </fieldset>

    <fieldset class="group" class:locked={downward} disabled={saving || downward}>
      <legend class="label">{READING_DIRECTION_LEGEND}</legend>
      {#each READING_DIRECTION_CHOICES as choice (choice.value)}
        <label class="choice">
          <input
            type="radio"
            name="{uid}-direction"
            value={choice.value}
            bind:group={form.direction}
          />
          <span>{choice.label}</span>
        </label>
      {/each}
    </fieldset>

    <fieldset class="group" class:locked={downward} disabled={saving || downward}>
      <legend class="label">{PAGE_PAIRING_LEGEND}</legend>
      {#each PAGE_PAIRING_CHOICES as choice (choice.value)}
        <label class="choice">
          <input
            type="radio"
            name="{uid}-pairing"
            value={choice.value}
            bind:group={form.pagePairing}
          />
          <span>{choice.label}</span>
        </label>
      {/each}
    </fieldset>

    <div class="actions">
      <button class="cancel" type="button" disabled={saving} onclick={requestClose}>Cancel</button>
      <button class="save" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
    </div>
  </form>
</dialog>

<style>
  dialog {
    width: min(420px, calc(100% - var(--s-5)));
    max-height: 86vh;
    margin: auto;
    padding: 0;
    overflow: auto;
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
    gap: var(--s-4);
    padding: var(--s-5);
    font-family: var(--f-ui);
  }

  .heading {
    margin: 0;
    color: var(--c-text-1);
    font-size: 15px;
    font-weight: 500;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
  }

  .label {
    padding: 0;
    color: var(--c-text-6);
    font-family: var(--f-ui);
    font-size: 11px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .text {
    width: 100%;
    height: 32px;
    padding: 0 var(--s-3);
    border: 1px solid var(--c-border-3);
    border-radius: var(--r-4);
    background: var(--c-surface-chip);
    color: var(--c-text-2);
    font-family: var(--f-ja);
    font-size: 12.5px;
  }

  .text.ko {
    font-family: var(--f-ko);
  }

  .text:focus-visible {
    border-color: var(--c-accent-border);
    outline: none;
  }

  .group {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-2) var(--s-4);
    margin: 0;
    padding: 0;
    border: 0;
  }

  .group > .label {
    flex: 1 0 100%;
    margin-bottom: var(--s-1);
  }

  .group.locked {
    opacity: 0.5;
  }

  .choice {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    color: var(--c-text-4);
    font-size: 12.5px;
  }

  .choice input {
    width: 14px;
    height: 14px;
    margin: 0;
    accent-color: var(--c-accent);
  }

  .group:not(:disabled) .choice {
    cursor: pointer;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--s-2);
    margin-top: var(--s-1);
  }

  .cancel,
  .save {
    padding: var(--s-2) var(--s-3);
    border-radius: var(--r-4);
    font-family: var(--f-ui);
    font-size: 12px;
    cursor: pointer;
  }

  .cancel {
    border: 1px solid var(--c-border-4);
    background: var(--c-surface-button);
    color: var(--c-text-5);
  }

  .save {
    border: 1px solid var(--c-accent);
    background: var(--c-accent);
    color: var(--c-accent-text);
    font-weight: 600;
  }

  .cancel:disabled,
  .save:disabled {
    cursor: progress;
    opacity: 0.6;
  }
</style>
