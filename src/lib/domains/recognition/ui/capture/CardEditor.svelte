<script lang="ts">
  import type { CardEditing, CardField } from './card-editing.svelte';

  type Props = {
    readonly editing: CardEditing;
    readonly label: string | null;
    readonly field: CardField;
    readonly onsave: () => void;
    readonly onabandon: () => void;
  };

  let { editing, label, field, onsave, onabandon }: Props = $props();

  let area = $state<HTMLTextAreaElement | null>(null);

  $effect(() => {
    area?.focus();
  });

  function commit(event: SubmitEvent): void {
    event.preventDefault();
    onsave();
  }

  function editorKeys(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      onabandon();
      return;
    }

    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onsave();
    }
  }
</script>

<form class="editor" class:annotation={field.kind === 'note'} onsubmit={commit}>
  {#if field.kind === 'note'}
    <p class="label">Your note</p>
  {/if}
  <textarea
    bind:this={area}
    bind:value={editing.draft}
    class="field"
    class:ko={field.kind === 'capture' && field.language === 'ko'}
    class:plain={field.kind === 'note'}
    lang={field.kind === 'capture' ? field.language : null}
    rows="3"
    aria-label={label}
    onkeydown={editorKeys}></textarea>
  <p class="hint">Escape abandons · ⌘/Ctrl + Enter saves</p>
  <div class="choices">
    <button class="abandon" type="button" onclick={onabandon}>Cancel</button>
    <button class="save" type="submit">Save</button>
  </div>
</form>

<style>
  .editor {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
  }

  .annotation {
    margin-top: var(--s-2);
    padding-left: var(--s-2);
    border-left: 3px solid var(--c-note);
  }

  .label {
    margin: 0 0 3px;
    color: var(--c-note);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .field {
    width: 100%;
    padding: var(--s-2);
    border: 1px solid var(--c-accent-border);
    border-radius: var(--r-4);
    background: var(--c-surface-chip);
    color: var(--c-text-1);
    font-family: var(--f-ja);
    font-size: 15px;
    line-height: 1.6;
    resize: vertical;
  }

  .field.ko {
    font-family: var(--f-ko);
  }

  .field.plain {
    font-family: var(--f-ui);
    font-size: 12.5px;
  }

  .field:focus-visible {
    outline: none;
    border-color: var(--c-accent);
  }

  .hint {
    margin: 0;
    color: var(--c-text-9);
    font-size: 10.5px;
  }

  .choices {
    display: flex;
    justify-content: flex-end;
    gap: var(--s-2);
  }

  .abandon,
  .save {
    padding: var(--s-1) var(--s-3);
    border-radius: var(--r-4);
    font-family: var(--f-ui);
    font-size: 11px;
    cursor: pointer;
  }

  .abandon {
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
</style>
