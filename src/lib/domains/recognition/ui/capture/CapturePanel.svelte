<script lang="ts">
  import { clearWarning } from './clearing';
  import { tick } from 'svelte';
  import { match } from 'ts-pattern';
  import { goto } from '$app/navigation';
  import type { TextAnchor } from '$lib/shared/anchor';
  import type { Language } from '$lib/shared/language';
  import type { ReadingDirection } from '$lib/shared/layout-kind';
  import { engineMismatch } from '../../domain/engine/ocr-engine';
  import { CardEditing } from './card-editing.svelte';
  import type { FocusTarget } from './card-editing.svelte';
  import { CaptureCards } from './capture-cards.svelte';
  import type { CardJump } from './capture-cards.svelte';
  import type { CaptureView } from './capture-view.svelte';
  import { TagSelection } from './tag-selection.svelte';
  import { modelLoadAnnouncement } from '../engine/recognizer-view.svelte';
  import CardEditor from './CardEditor.svelte';
  import CaptureTagging from './CaptureTagging.svelte';
  import DocumentTags from './DocumentTags.svelte';
  import ModelConsentDialog from '../engine/ModelConsentDialog.svelte';

  type Props = {
    readonly view: CaptureView;
    readonly language: Language | null;
    readonly direction: ReadingDirection;
    readonly onSeek?: (passage: TextAnchor) => void;
    readonly asksConsent?: boolean;
  };

  let { view, language, direction, onSeek, asksConsent = true }: Props = $props();

  const mismatch = $derived(engineMismatch(view.session, language));

  const panel = new CaptureCards(() => ({
    captures: view.captures,
    newestFirst: view.newestFirst,
    tags: view.tags,
    book: view.book,
    progress: view.progress,
    direction,
    seekable: onSeek !== undefined,
  }));

  const editingText = new CardEditing();

  const editingNote = new CardEditing();

  const selection = new TagSelection(
    {
      tagsOn: (id) => view.captures.find((capture) => capture.id === id)?.tagIds ?? [],
      loadCounts: () => view.loadTagCounts(),
      add: (id, tag) => view.addTag(id, tag),
      remove: (id, tag) => view.removeTag(id, tag),
      create: (id, name) => view.createTag(id, name),
    },
    () => ({ tags: view.tags, counts: view.libraryCounts }),
  );

  $effect(() => {
    const fresh = view.writing;
    if (fresh === null) return;

    view.takeWriting();
    editingText.begin(fresh, '', null);
  });

  const waiting = $derived(view.captures.some((capture) => capture.status === 'pending'));

  const announcement = $derived(waiting ? modelLoadAnnouncement(view.progress) : '');

  const cards = $derived(panel.cards);

  const cursor = $derived(panel.cursor);

  const searching = $derived(panel.searching);

  function openHref(href: string, replace: boolean): void {
    void goto(href, { replaceState: replace, keepFocus: true, noScroll: true });
  }

  function navigate(jump: CardJump): void {
    match(jump)
      .with({ kind: 'nowhere' }, () => undefined)
      .with({ kind: 'fresh' }, (fresh) => openHref(fresh.href, false))
      .with({ kind: 'replacing' }, (again) => openHref(again.href, true))
      .exhaustive();
  }

  function follow(event: MouseEvent, at: number): void {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const jump = panel.jumpTo(at);
    if (jump.kind === 'nowhere') return;

    event.preventDefault();
    navigate(jump);
  }

  function stepBy(by: number): void {
    navigate(panel.jumpTo(panel.cursor + by));
  }

  function stepOnEnter(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;

    event.preventDefault();
    stepBy(1);
  }

  async function restore(from: FocusTarget | null): Promise<void> {
    await tick();
    from?.focus();
  }

  function abandonText(): void {
    void restore(editingText.abandon());
  }

  function saveText(): void {
    const id = editingText.capture;
    if (id === null) return;

    const written = editingText.draft;
    abandonText();
    void view.edit(id, written);
  }

  function abandonNote(): void {
    void restore(editingNote.abandon());
  }

  function saveNote(): void {
    const id = editingNote.capture;
    if (id === null) return;

    const written = editingNote.draft;
    abandonNote();
    void view.annotate(id, written);
  }

  const warning = $derived(view.confirmingClear ? clearWarning(view.clearing) : null);
</script>

<section class="panel" aria-label="Captures">
  <header class="head">
    <h2 class="name">Captures</h2>
    <span class="count">{view.count}</span>
    <kbd class="shortcut" title="Find in captures">⌘K</kbd>
    <button class="clear" type="button" disabled={view.count === 0} onclick={() => view.askClear()}>
      Clear
    </button>
  </header>

  {#if warning !== null}
    <div class="confirm" role="alertdialog" aria-label="Delete every capture">
      <p class="warning">{warning}</p>
      <div class="choices">
        <button class="keep" type="button" onclick={() => view.dismissClear()}>Keep them</button>
        <button class="delete" type="button" onclick={() => void view.clear()}>Delete</button>
      </div>
    </div>
  {/if}

  {#if view.count > 0}
    <div class="find">
      <label class="search">
        <span class="assistive">Search this book's captures and notes</span>
        <input
          type="search"
          bind:value={panel.query}
          placeholder="Search captures and notes…"
          title="Search this book's captures and notes · Enter steps to the next match"
          onkeydown={stepOnEnter}
        />
      </label>
      {#if searching}
        <p class="tally" role="status">
          {cursor < 0
            ? `${cards.length} of ${view.count} matched`
            : `match ${cursor + 1} of ${cards.length}`}
        </p>
        <span class="steps">
          <button class="tool" type="button" disabled={cursor <= 0} onclick={() => stepBy(-1)}>
            <span class="glyph" aria-hidden="true">‹</span>
            <span class="assistive">Previous match</span>
          </button>
          <button
            class="tool"
            type="button"
            disabled={cursor + 1 >= cards.length}
            onclick={() => stepBy(1)}
          >
            <span class="glyph" aria-hidden="true">›</span>
            <span class="assistive">Next match</span>
          </button>
        </span>
      {/if}
    </div>
  {/if}

  <p class="assistive" role="status">{announcement}</p>

  {#if mismatch !== null}
    <p class="mismatch" role="status">{mismatch}</p>
  {/if}

  {#if cards.length === 0}
    {#if searching}
      <p class="invitation">No capture or note in this book holds that text.</p>
    {:else}
      <p class="invitation">Drag a box over a speech bubble and the text arrives here.</p>
    {/if}
  {:else}
    <ul class="list">
      {#each cards as card, order (card.id)}
        <li class="slot">
          <article
            class="card {card.tone}"
            class:written={card.origin === 'written'}
            class:at={searching && order === cursor}
          >
            <header class="stamp">
              {#if card.passage !== null}
                {@const passage = card.passage}
                <button class="place jump" type="button" onclick={() => onSeek?.(passage)}>
                  {card.place}
                  <span class="assistive">Open the book at this passage</span>
                </button>
              {:else if card.href === null}
                <span class="place">{card.place}</span>
              {:else}
                <a class="place jump" href={card.href} onclick={(event) => follow(event, order)}>
                  {card.place}
                </a>
              {/if}
              {#if card.edited}
                <span class="mark">Edited</span>
              {/if}
              <span class="state">{card.stateLabel}</span>
              <span class="tools">
                {#if card.editable}
                  <button
                    class="tool"
                    type="button"
                    disabled={editingText.holds(card.id)}
                    onclick={(event) =>
                      editingText.begin(card.id, card.text ?? '', event.currentTarget)}
                  >
                    <span class="glyph" aria-hidden="true">✎</span>
                    <span class="assistive">Edit the capture at {card.place}</span>
                  </button>
                {/if}
                {#if card.noteLabel !== null}
                  <button
                    class="tool named"
                    type="button"
                    disabled={editingNote.holds(card.id)}
                    onclick={(event) =>
                      editingNote.begin(card.id, card.annotation ?? '', event.currentTarget)}
                  >
                    <span class="glyph" aria-hidden="true"
                      >{card.annotation === null ? '+' : '✎'}</span
                    >
                    <span class="word" aria-hidden="true">note</span>
                    <span class="assistive">{card.noteLabel}</span>
                  </button>
                {/if}
                <button class="tool drop" type="button" onclick={() => void view.remove(card.id)}>
                  <span class="glyph" aria-hidden="true">×</span>
                  <span class="assistive">Remove the capture at {card.place}</span>
                </button>
              </span>
            </header>
            {#if editingText.holds(card.id)}
              <CardEditor
                editing={editingText}
                label="Text of the capture at {card.place}"
                field={{ kind: 'capture', language }}
                onsave={saveText}
                onabandon={abandonText}
              />
            {:else if card.segments !== null}
              <p class="text" class:ko={language === 'ko'} lang={language}>
                {#each card.segments as segment, part (part)}{#if segment.matched}<mark class="hit"
                      >{segment.text}</mark
                    >{:else}{segment.text}{/if}{/each}
              </p>
            {:else if card.text !== null}
              <p class="text" class:ko={language === 'ko'} lang={language}>{card.text}</p>
            {/if}
            {#if editingNote.holds(card.id)}
              <CardEditor
                editing={editingNote}
                label={card.noteLabel}
                field={{ kind: 'note' }}
                onsave={saveNote}
                onabandon={abandonNote}
              />
            {:else if card.annotation !== null}
              <div class="annotation">
                <p class="label">Your note</p>
                {#if card.annotationSegments === null}
                  <p class="wrote">{card.annotation}</p>
                {:else}
                  <p class="wrote">
                    {#each card.annotationSegments as segment, part (part)}{#if segment.matched}<mark
                          class="hit">{segment.text}</mark
                        >{:else}{segment.text}{/if}{/each}
                  </p>
                {/if}
              </div>
            {/if}
            {#if card.note !== null}
              <p class="note">{card.note}</p>
            {/if}
            <CaptureTagging {selection} capture={card.id} chips={card.tags} place={card.place} />
          </article>
        </li>
      {/each}
    </ul>
  {/if}

  <DocumentTags tags={view.tags} counts={view.bookCounts} />

  {#if asksConsent && view.consentRequest !== null}
    <ModelConsentDialog
      request={view.consentRequest}
      onagree={() => void view.agree()}
      ondecline={() => view.decline()}
    />
  {/if}
</section>

<style>
  .confirm {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
    padding: var(--s-3) var(--s-4);
    border-bottom: 1px solid var(--c-border-1);
    background: var(--c-accent-wash-faint);
  }

  .warning {
    margin: 0;
    color: var(--c-text-2);
    font-size: 12px;
  }

  .choices {
    display: flex;
    justify-content: flex-end;
    gap: var(--s-2);
  }

  .keep,
  .delete {
    padding: var(--s-1) var(--s-3);
    border: 1px solid var(--c-border-4);
    border-radius: var(--r-pill);
    background: var(--c-surface-button);
    color: var(--c-text-5);
    font-family: var(--f-ui);
    font-size: 11px;
    cursor: pointer;
  }

  .delete {
    border-color: var(--c-warning);
    color: var(--c-warning);
  }

  .keep:hover,
  .delete:hover {
    border-color: var(--c-accent-border);
  }

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

  .shortcut {
    flex: none;
    padding: 2px var(--s-1);
    border: 1px solid var(--c-border-4);
    border-radius: var(--r-1);
    background: var(--c-surface-chip);
    color: var(--c-text-8);
    font-family: var(--f-mono);
    font-size: 10px;
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

  .find {
    display: flex;
    flex: none;
    align-items: center;
    gap: var(--s-2);
    padding: var(--s-2) var(--s-4);
    border-bottom: 1px solid var(--c-border-1);
  }

  .search {
    display: block;
    flex: 1 1 auto;
    min-width: 0;
  }

  .search input {
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

  .search input::placeholder {
    color: var(--c-text-placeholder);
  }

  .search input:focus-visible {
    outline: none;
    border-color: var(--c-accent-border);
  }

  .tally {
    flex: none;
    margin: 0;
    color: var(--c-text-8);
    font-family: var(--f-mono);
    font-size: 10.5px;
  }

  .hit {
    border-radius: var(--r-1);
    background: var(--c-accent-wash-strong);
    color: var(--c-text-1);
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

  .mismatch {
    margin: 0 var(--s-4) var(--s-2);
    padding: var(--s-2) var(--s-3);
    border: 1px solid var(--c-border-3);
    border-radius: var(--r-3);
    background: var(--c-surface-chip);
    color: var(--c-text-7);
    font-size: 11.5px;
    line-height: 1.45;
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
    border-radius: var(--r-4);
    background: var(--c-surface-card-quiet);
  }

  .card.done {
    border-color: var(--c-border-6);
    background: var(--c-surface-card-active);
  }

  .card.failed {
    border-color: var(--c-warning);
  }

  .card.written {
    border-color: var(--c-note-border);
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

  .jump {
    text-decoration: none;
  }

  button.place {
    padding: 0;
    border: none;
    background: none;
    text-align: start;
    cursor: pointer;
  }

  .jump:hover,
  .jump:focus-visible {
    color: var(--c-accent);
  }

  .card.at {
    border-color: var(--c-accent);
  }

  .steps {
    display: flex;
    flex: none;
    align-items: center;
    gap: var(--s-1);
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

  .card.written .state {
    color: var(--c-note);
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
    border-radius: var(--r-1);
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

  .note {
    margin: 0;
    color: var(--c-text-7);
    font-size: 11.5px;
    line-height: 1.5;
  }

  .card.failed .note {
    color: var(--c-text-4);
  }

  .tool.named {
    gap: 3px;
    width: auto;
    padding: 0 5px;
  }

  .word {
    font-size: 10px;
    letter-spacing: 0.02em;
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

  .wrote {
    margin: 0;
    color: var(--c-text-3);
    font-size: 12.5px;
    line-height: 1.55;
    white-space: pre-wrap;
    user-select: text;
  }
</style>
