<script lang="ts">
  import { tick } from 'svelte';
  import { match } from 'ts-pattern';
  import type { CaptureId } from '$lib/shared/ids';
  import type { ImageRegion } from '$lib/shared/image-region';
  import type { Language } from '$lib/shared/language';
  import { NOTHING_READ, type CaptureStatus, type CaptureView } from './capture-view.svelte';
  import ModelConsentDialog from './ModelConsentDialog.svelte';

  type Props = {
    readonly view: CaptureView;
    readonly language: Language | null;
  };

  type Card = {
    readonly id: CaptureId;
    readonly place: string;
    readonly state: string;
    readonly text: string | null;
    readonly note: string | null;
    readonly tone: CaptureStatus;
    readonly edited: boolean;
    readonly editable: boolean;
  };

  let { view, language }: Props = $props();

  let editing = $state<CaptureId | null>(null);
  let draft = $state('');
  let editor = $state<HTMLTextAreaElement | null>(null);
  let trigger: HTMLButtonElement | null = null;

  $effect(() => {
    editor?.focus();
  });

  const percent = $derived(view.progress === null ? null : Math.round(view.progress * 100));

  const waiting = $derived(view.captures.some((capture) => capture.status === 'pending'));

  const announcement = $derived.by(() => {
    if (!waiting) return '';
    return percent === null
      ? 'Reading the selection.'
      : `Downloading the recognition model, ${percent} percent.`;
  });

  function page(region: ImageRegion): string {
    return String(region.index + 1).padStart(3, '0');
  }

  function placeOf(regions: readonly ImageRegion[]): string {
    const first = regions[0];
    const last = regions.at(-1);
    if (first === undefined || last === undefined) return 'no page';

    const span = first.index === last.index ? `p.${page(first)}` : `p.${page(first)}–${page(last)}`;
    return regions.length > 1 ? `${span} · ${regions.length} regions` : span;
  }

  const cards = $derived.by<readonly Card[]>(() =>
    view.newestFirst.map((capture) =>
      match(capture)
        .with({ status: 'pending' }, (running) => ({
          id: running.id,
          place: placeOf(running.regions),
          state: 'Reading…',
          text: null,
          note: percent === null ? null : `Downloading the model · ${percent}%`,
          tone: 'pending' as CaptureStatus,
          edited: false,
          editable: false,
        }))
        .with({ status: 'done' }, (read) => ({
          id: read.id,
          place: placeOf(read.regions),
          state: 'Read',
          text: read.text.text,
          note: null,
          tone: 'done' as CaptureStatus,
          edited: read.edited,
          editable: true,
        }))
        .with({ status: 'empty' }, (blank) => ({
          id: blank.id,
          place: placeOf(blank.regions),
          state: 'No text',
          text: null,
          note: NOTHING_READ,
          tone: 'empty' as CaptureStatus,
          edited: false,
          editable: false,
        }))
        .with({ status: 'failed' }, (broken) => ({
          id: broken.id,
          place: placeOf(broken.regions),
          state: 'Failed',
          text: null,
          note: broken.message,
          tone: 'failed' as CaptureStatus,
          edited: false,
          editable: false,
        }))
        .exhaustive(),
    ),
  );

  function begin(card: Card, from: HTMLButtonElement): void {
    editing = card.id;
    draft = card.text ?? '';
    trigger = from;
  }

  async function abandon(): Promise<void> {
    editing = null;
    draft = '';
    await tick();
    trigger?.focus();
    trigger = null;
  }

  function save(): void {
    const id = editing;
    if (id === null) return;

    const text = draft;
    void abandon();
    void view.edit(id, text);
  }

  function commit(event: SubmitEvent): void {
    event.preventDefault();
    save();
  }

  function keys(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      void abandon();
      return;
    }

    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      save();
    }
  }
</script>

<section class="panel" aria-label="Captures">
  <header class="head">
    <h2 class="name">Captures</h2>
    <span class="count">{view.count}</span>
    <button
      class="clear"
      type="button"
      disabled={view.count === 0}
      onclick={() => void view.clear()}
    >
      Clear
    </button>
  </header>

  <p class="assistive" role="status">{announcement}</p>

  {#if cards.length === 0}
    <p class="invitation">Drag a box over a speech bubble and the text arrives here.</p>
  {:else}
    <ul class="list">
      {#each cards as card (card.id)}
        <li class="slot">
          <article class="card {card.tone}">
            <header class="stamp">
              <span class="place">{card.place}</span>
              {#if card.edited}
                <span class="mark">Edited</span>
              {/if}
              <span class="state">{card.state}</span>
              <span class="tools">
                {#if card.editable}
                  <button
                    class="tool"
                    type="button"
                    disabled={editing === card.id}
                    onclick={(event) => begin(card, event.currentTarget)}
                  >
                    <span class="glyph" aria-hidden="true">✎</span>
                    <span class="assistive">Edit the capture at {card.place}</span>
                  </button>
                {/if}
                <button class="tool drop" type="button" onclick={() => void view.remove(card.id)}>
                  <span class="glyph" aria-hidden="true">×</span>
                  <span class="assistive">Remove the capture at {card.place}</span>
                </button>
              </span>
            </header>
            {#if editing === card.id}
              <form class="editor" onsubmit={commit}>
                <textarea
                  bind:this={editor}
                  bind:value={draft}
                  class="field"
                  class:ko={language === 'ko'}
                  lang={language}
                  rows="3"
                  aria-label="Text of the capture at {card.place}"
                  onkeydown={keys}></textarea>
                <p class="hint">Escape abandons · ⌘/Ctrl + Enter saves</p>
                <div class="choices">
                  <button class="abandon" type="button" onclick={() => void abandon()}>
                    Cancel
                  </button>
                  <button class="save" type="submit">Save</button>
                </div>
              </form>
            {:else if card.text !== null}
              <p class="text" class:ko={language === 'ko'} lang={language}>{card.text}</p>
            {/if}
            {#if card.note !== null}
              <p class="note">{card.note}</p>
            {/if}
          </article>
        </li>
      {/each}
    </ul>
  {/if}

  {#if view.consentRequest !== null}
    <ModelConsentDialog
      request={view.consentRequest}
      onagree={() => void view.agree()}
      ondecline={() => view.decline()}
    />
  {/if}
</section>

<style>
  .panel {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    font-family: var(--f-ui);
  }

  .head {
    display: flex;
    flex: none;
    align-items: center;
    gap: var(--s-2);
    padding: var(--s-3) var(--s-4);
    border-bottom: 1px solid var(--c-border-1);
  }

  .name {
    margin: 0;
    color: var(--c-text-3);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .count {
    flex: 1 1 auto;
    color: var(--c-text-8);
    font-family: var(--f-mono);
    font-size: 11px;
  }

  .clear {
    flex: none;
    padding: var(--s-1) var(--s-2);
    border: 1px solid var(--c-border-4);
    border-radius: var(--r-pill);
    background: var(--c-surface-button);
    color: var(--c-text-5);
    font-family: var(--f-ui);
    font-size: 11px;
    cursor: pointer;
  }

  .clear:hover:not(:disabled),
  .clear:focus-visible {
    border-color: var(--c-accent-border);
    color: var(--c-accent);
  }

  .clear:disabled {
    cursor: default;
    opacity: 0.4;
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

  .invitation {
    margin: 0;
    padding: var(--s-5) var(--s-4);
    color: var(--c-text-9);
    font-size: 11.5px;
    line-height: 1.6;
  }

  .list {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: var(--s-2);
    margin: 0;
    padding: var(--s-3);
    overflow-y: auto;
    list-style: none;
  }

  .slot {
    flex: none;
  }

  .card {
    padding: var(--s-3);
    border: 1px solid var(--c-border-3);
    border-radius: var(--r-md);
    background: var(--c-surface-card-quiet);
  }

  .card.done {
    border-color: var(--c-border-6);
    background: var(--c-surface-card-active);
  }

  .card.failed {
    border-color: var(--c-warning);
  }

  .stamp {
    display: flex;
    align-items: baseline;
    gap: var(--s-2);
    margin-bottom: var(--s-2);
  }

  .place {
    flex: 1 1 auto;
    color: var(--c-text-9);
    font-family: var(--f-mono);
    font-size: 10.5px;
    letter-spacing: 0.02em;
  }

  .mark {
    flex: none;
    color: var(--c-text-9);
    font-size: 10px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .state {
    flex: none;
    color: var(--c-text-8);
    font-size: 10px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .card.done .state {
    color: var(--c-accent);
  }

  .card.failed .state {
    color: var(--c-warning);
  }

  .text {
    margin: 0;
    color: var(--c-text-1);
    font-family: var(--f-ja);
    font-size: 17px;
    line-height: 1.7;
    user-select: text;
  }

  .text.ko {
    font-family: var(--f-ko);
  }

  .tools {
    display: flex;
    flex: none;
    align-items: center;
    gap: var(--s-3);
    margin-left: var(--s-1);
  }

  .tool {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: var(--r-sm);
    background: none;
    color: var(--c-text-9);
    font-family: var(--f-ui);
    cursor: pointer;
  }

  .tool:hover:not(:disabled),
  .tool:focus-visible {
    border-color: var(--c-accent-border);
    color: var(--c-accent);
  }

  .tool.drop:hover,
  .tool.drop:focus-visible {
    border-color: var(--c-warning);
    color: var(--c-warning);
  }

  .tool:disabled {
    cursor: default;
    opacity: 0.4;
  }

  .glyph {
    font-size: 11px;
    line-height: 1;
  }

  .editor {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
  }

  .field {
    width: 100%;
    padding: var(--s-2);
    border: 1px solid var(--c-accent-border);
    border-radius: var(--r-md);
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
    border-radius: var(--r-md);
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

  .note {
    margin: 0;
    color: var(--c-text-7);
    font-size: 11.5px;
    line-height: 1.5;
  }

  .card.failed .note {
    color: var(--c-text-4);
  }
</style>
