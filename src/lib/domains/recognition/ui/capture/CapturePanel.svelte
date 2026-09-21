<script lang="ts">
  import { clearWarning } from './clearing';
  import { tick } from 'svelte';
  import { match } from 'ts-pattern';
  import { goto } from '$app/navigation';
  import type { CaptureOrigin } from '$lib/shared/capture-origin';
  import type { CaptureId, TagId } from '$lib/shared/ids';
  import type { ImageRegion } from '$lib/shared/image-region';
  import type { Language } from '$lib/shared/language';
  import type { ReadingDirection } from '$lib/shared/layout-kind';
  import { readerHref } from '$lib/shared/reader-location';
  import { segmentsOf, textMatches } from '$lib/shared/text-search';
  import type { TextMatch, TextSegment } from '$lib/shared/text-search';
  import { inBookOrder } from '../../domain/capture/capture-order';
  import { engineMismatch } from '../../domain/engine/ocr-engine';
  import { captureNote, captureState } from './capture-card';
  import { firstImage, placeLabel } from './capture-place';
  import { modelLoadAnnouncement, modelLoadNote, NOTHING_READ } from './capture-view.svelte';
  import type { CaptureStatus, CaptureView, PanelCapture } from './capture-view.svelte';
  import { chipsOf } from './tag-chip';
  import type { TagChip } from './tag-chip';
  import { TagPicker } from './tag-picker.svelte';
  import type { PickerRow } from './tag-picker.svelte';
  import CaptureTags from './CaptureTags.svelte';
  import DocumentTags from './DocumentTags.svelte';
  import TagPickerPopover from './TagPickerPopover.svelte';
  import ModelConsentDialog from '../engine/ModelConsentDialog.svelte';

  type Props = {
    readonly view: CaptureView;
    readonly language: Language | null;
    readonly direction: ReadingDirection;
  };

  type Card = {
    readonly id: CaptureId;
    readonly place: string;
    readonly href: string | null;
    readonly state: string;
    readonly text: string | null;
    readonly segments: readonly TextSegment[] | null;
    readonly note: string | null;
    readonly annotation: string | null;
    readonly noteLabel: string | null;
    readonly tags: readonly TagChip[];
    readonly tone: CaptureStatus;
    readonly origin: CaptureOrigin;
    readonly edited: boolean;
    readonly editable: boolean;
  };

  type Step = {
    readonly query: string;
    readonly at: number;
  };

  type Hit = {
    readonly capture: Extract<PanelCapture, { status: 'done' }>;
    readonly regions: readonly ImageRegion[];
    readonly matches: readonly TextMatch[];
  };

  let { view, language, direction }: Props = $props();

  const mismatch = $derived(engineMismatch(view.session, language));

  let query = $state('');
  let editing = $state<CaptureId | null>(null);
  let draft = $state('');
  let editor = $state<HTMLTextAreaElement | null>(null);
  let noting = $state<CaptureId | null>(null);
  let noteDraft = $state('');
  let noteEditor = $state<HTMLTextAreaElement | null>(null);
  let noteTrigger: HTMLButtonElement | null = null;
  let step = $state.raw<Step | null>(null);
  let trigger: HTMLButtonElement | null = null;
  let tagTrigger = $state<HTMLButtonElement | null>(null);
  let countsAsked = false;

  const picker = new TagPicker(() => ({ tags: view.tags, counts: view.libraryCounts }));

  $effect(() => {
    editor?.focus();
  });

  $effect(() => {
    noteEditor?.focus();
  });

  $effect(() => {
    const fresh = view.writing;
    if (fresh === null) return;

    view.takeWriting();
    editing = fresh;
    draft = '';
    trigger = null;
  });

  const load = $derived(view.progress);

  const waiting = $derived(view.captures.some((capture) => capture.status === 'pending'));

  const announcement = $derived(waiting ? modelLoadAnnouncement(load) : '');

  function hrefOf(id: CaptureId, regions: readonly ImageRegion[]): string | null {
    const book = view.book;
    const index = firstImage(regions);
    if (book === null || index === null) return null;

    return readerHref(book, index, { capture: id, query: searching ? wanted : null });
  }

  function annotationOf(capture: PanelCapture): string | null {
    return capture.origin === 'written' ? null : capture.note;
  }

  function noteLabelOf(capture: PanelCapture, place: string): string | null {
    if (capture.origin === 'written') return null;

    return capture.note === null
      ? `Add a note to the capture at ${place}`
      : `Edit the note on the capture at ${place}`;
  }

  function cardOf(capture: PanelCapture, matches: readonly TextMatch[]): Card {
    const tags = chipsOf(capture.tagIds, view.tags);

    return match(capture)
      .with({ status: 'pending' }, (running) => ({
        id: running.id,
        place: placeLabel(running.regions),
        href: hrefOf(running.id, running.regions),
        state: 'Reading…',
        text: null,
        segments: null,
        note: load === null ? null : modelLoadNote(load),
        annotation: null,
        noteLabel: null,
        tags,
        tone: 'pending' as CaptureStatus,
        origin: running.origin,
        edited: false,
        editable: false,
      }))
      .with({ status: 'done' }, (read) => ({
        id: read.id,
        place: placeLabel(read.regions),
        href: hrefOf(read.id, read.regions),
        state: captureState(read.origin),
        text: read.text.text,
        segments: matches.length === 0 ? null : segmentsOf(read.text.text, matches),
        note: captureNote(read.origin, read.text.text),
        annotation: annotationOf(read),
        noteLabel: noteLabelOf(read, placeLabel(read.regions)),
        tags,
        tone: 'done' as CaptureStatus,
        origin: read.origin,
        edited: read.edited,
        editable: true,
      }))
      .with({ status: 'empty' }, (blank) => ({
        id: blank.id,
        place: placeLabel(blank.regions),
        href: hrefOf(blank.id, blank.regions),
        state: 'No text',
        text: null,
        segments: null,
        note: NOTHING_READ,
        annotation: null,
        noteLabel: null,
        tags,
        tone: 'empty' as CaptureStatus,
        origin: blank.origin,
        edited: false,
        editable: false,
      }))
      .with({ status: 'failed' }, (broken) => ({
        id: broken.id,
        place: placeLabel(broken.regions),
        href: hrefOf(broken.id, broken.regions),
        state: 'Failed',
        text: null,
        segments: null,
        note: broken.message,
        annotation: null,
        noteLabel: null,
        tags,
        tone: 'failed' as CaptureStatus,
        origin: broken.origin,
        edited: false,
        editable: false,
      }))
      .exhaustive();
  }

  function hitOf(capture: PanelCapture, wanted: string): Hit | null {
    if (capture.status !== 'done') return null;

    const matches = textMatches(capture.text.text, wanted);
    return matches.length === 0 ? null : { capture, regions: capture.regions, matches };
  }

  const wanted = $derived(query.trim());

  const searching = $derived(wanted.length > 0);

  const hits = $derived.by<readonly Hit[] | null>(() => {
    if (!searching) return null;

    const found = view.captures
      .map((capture) => hitOf(capture, wanted))
      .filter((hit) => hit !== null);

    return inBookOrder(found, direction);
  });

  const cards = $derived.by<readonly Card[]>(() =>
    hits === null
      ? view.newestFirst.map((capture) => cardOf(capture, []))
      : hits.map((hit) => cardOf(hit.capture, hit.matches)),
  );

  const cursor = $derived(searching && step !== null && step.query === wanted ? step.at : -1);

  function jump(href: string, at: number): void {
    const replace = cursor >= 0;
    step = searching ? { query: wanted, at } : null;
    void goto(href, { replaceState: replace, keepFocus: true, noScroll: true });
  }

  function follow(event: MouseEvent, card: Card, at: number): void {
    if (card.href === null || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    jump(card.href, at);
  }

  function stepBy(by: number): void {
    const next = cursor + by;
    const card = cards[next];
    if (card === undefined || card.href === null) return;

    jump(card.href, next);
  }

  function findKeys(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;

    event.preventDefault();
    stepBy(1);
  }

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

  function beginNote(card: Card, from: HTMLButtonElement): void {
    noting = card.id;
    noteDraft = card.annotation ?? '';
    noteTrigger = from;
  }

  async function abandonNote(): Promise<void> {
    noting = null;
    noteDraft = '';
    await tick();
    noteTrigger?.focus();
    noteTrigger = null;
  }

  function saveNote(): void {
    const id = noting;
    if (id === null) return;

    const note = noteDraft;
    void abandonNote();
    void view.annotate(id, note);
  }

  function commitNote(event: SubmitEvent): void {
    event.preventDefault();
    saveNote();
  }

  function noteKeys(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      void abandonNote();
      return;
    }

    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      saveNote();
    }
  }

  function carriedBy(id: CaptureId): readonly TagId[] {
    return view.captures.find((capture) => capture.id === id)?.tagIds ?? [];
  }

  function openPicker(id: CaptureId, from: HTMLButtonElement): void {
    if (!countsAsked) {
      countsAsked = true;
      void view.loadTagCounts();
    }

    tagTrigger = from;
    picker.open(id, carriedBy(id));
  }

  async function closePicker(): Promise<void> {
    picker.close();
    await tick();
    tagTrigger?.focus();
    tagTrigger = null;
  }

  async function choose(row: PickerRow): Promise<void> {
    const id = picker.capture;
    if (id === null) return;

    if (row.kind === 'create') await view.createTag(id, row.name);
    else await view.addTag(id, row.tag.id);

    if (picker.capture === id) picker.open(id, carriedBy(id));
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
        <span class="assistive">Search recognized text</span>
        <input
          type="search"
          bind:value={query}
          placeholder="Search recognized text…"
          title="Search this book's recognized text · Enter steps to the next match"
          onkeydown={findKeys}
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
      <p class="invitation">No capture in this book holds that text.</p>
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
              {#if card.href === null}
                <span class="place">{card.place}</span>
              {:else}
                <a
                  class="place jump"
                  href={card.href}
                  onclick={(event) => follow(event, card, order)}
                >
                  {card.place}
                </a>
              {/if}
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
                {#if card.noteLabel !== null}
                  <button
                    class="tool named"
                    type="button"
                    disabled={noting === card.id}
                    onclick={(event) => beginNote(card, event.currentTarget)}
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
            {:else if card.segments !== null}
              <p class="text" class:ko={language === 'ko'} lang={language}>
                {#each card.segments as segment, part (part)}{#if segment.matched}<mark class="hit"
                      >{segment.text}</mark
                    >{:else}{segment.text}{/if}{/each}
              </p>
            {:else if card.text !== null}
              <p class="text" class:ko={language === 'ko'} lang={language}>{card.text}</p>
            {/if}
            {#if noting === card.id}
              <form class="editor annotation" onsubmit={commitNote}>
                <p class="label">Your note</p>
                <textarea
                  bind:this={noteEditor}
                  bind:value={noteDraft}
                  class="field plain"
                  rows="3"
                  aria-label={card.noteLabel}
                  onkeydown={noteKeys}></textarea>
                <p class="hint">Escape abandons · ⌘/Ctrl + Enter saves</p>
                <div class="choices">
                  <button class="abandon" type="button" onclick={() => void abandonNote()}>
                    Cancel
                  </button>
                  <button class="save" type="submit">Save</button>
                </div>
              </form>
            {:else if card.annotation !== null}
              <div class="annotation">
                <p class="label">Your note</p>
                <p class="wrote">{card.annotation}</p>
              </div>
            {/if}
            {#if card.note !== null}
              <p class="note">{card.note}</p>
            {/if}
            <CaptureTags
              chips={card.tags}
              place={card.place}
              onremove={(tag) => void view.removeTag(card.id, tag)}
              onadd={(from) => openPicker(card.id, from)}
            />
            {#if picker.capture === card.id}
              <TagPickerPopover
                {picker}
                anchor={tagTrigger}
                onchoose={(row) => void choose(row)}
                onclose={() => void closePicker()}
              />
            {/if}
          </article>
        </li>
      {/each}
    </ul>
  {/if}

  <DocumentTags tags={view.tags} counts={view.bookCounts} />

  {#if view.consentRequest !== null}
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

  a.jump {
    text-decoration: none;
  }

  a.jump:hover,
  a.jump:focus-visible {
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

  .editor {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
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

  .field.plain {
    font-family: var(--f-ui);
    font-size: 12.5px;
  }
</style>
