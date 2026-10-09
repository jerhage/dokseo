<script lang="ts">
  import { tick } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import { match } from 'ts-pattern';
  import { goto } from '$app/navigation';
  import Alert from '$lib/ui/components/Alert.svelte';
  import Badge from '$lib/ui/components/Badge.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Dropdown from '$lib/ui/components/Dropdown.svelte';
  import DropdownItem from '$lib/ui/components/DropdownItem.svelte';
  import Modal from '$lib/ui/components/Modal.svelte';
  import SearchField from '$lib/ui/components/SearchField.svelte';
  import Stepper from '$lib/ui/components/Stepper.svelte';
  import type { StepperSteps } from '$lib/ui/components/stepper';
  import ArrowUpDown from '$lib/ui/components/icons/ArrowUpDown.svelte';
  import Ellipsis from '$lib/ui/components/icons/Ellipsis.svelte';
  import Trash from '$lib/ui/components/icons/Trash.svelte';
  import type { TextAnchor } from '$lib/shared/anchor';
  import { BookCapturesExport } from '$lib/shared/book-captures-export.svelte';
  import BookCapturesExportButton from '$lib/shared/BookCapturesExportButton.svelte';
  import { isComposingKey } from '$lib/shared/composing-key';
  import type { CaptureId } from '$lib/shared/ids';
  import type { Language } from '$lib/shared/language';
  import type { ReadingDirection } from '$lib/shared/layout-kind';
  import { engineMismatch } from '../../domain/engine/ocr-engine';
  import { tagCounts } from '../../domain/tag/capture-tags';
  import { createCaptureSearch } from './capture-search.svelte';
  import type { Card } from './capture-card-projection';
  import { cardsOf, cursorOf, jumpAt, orderedCaptures, searchHits } from './capture-card-rules';
  import type { CardJump, CardSource } from './capture-card-rules';
  import { newestFirstOf, panelCapturesOf, storedIn } from './capture-list-rules';
  import type { CaptureLookup } from './capture-list-rules';
  import { announcementOf, taggingCard, writtenIn } from './capture-panel-rules';
  import type { PanelEnvironment } from './capture-panel-rules';
  import type { CaptureListing } from './capture-read';
  import type { CaptureView } from './capture-view.svelte';
  import { createCaptureSort } from './capture-sort-choice.svelte';
  import { CAPTURE_SORTS, CAPTURE_SORT_LABEL, captureSortName } from './capture-sort';
  import { createCardReveal } from './card-reveal';
  import { clearScope, clearWarning } from './clearing';
  import { createClearConfirm } from './clear-confirm.svelte';
  import { emptyPanelText } from './empty-panel';
  import type { CaptureSource } from './empty-panel';
  import CaptureCard from './CaptureCard.svelte';
  import CaptureListData from './CaptureListData.svelte';
  import type { DraftField } from './card-drafts-session.svelte';
  import DocumentTags from './DocumentTags.svelte';
  import type { FocusTarget } from './focus-target';
  import { searchSteps } from './panel-search';
  import { rowsFor } from './tag-picker-rules';
  import { createTagSelection } from './tag-selection.svelte';
  import type { TagWriting } from './tag-selection.svelte';
  import TagPickerModal from './TagPickerModal.svelte';
  import { createTextCopy } from './text-copy.svelte';

  type Props = {
    readonly view: CaptureView;
    readonly listing: CaptureListing;
    readonly environment: PanelEnvironment;
    readonly direction: ReadingDirection;
    readonly language: Language | null;
    readonly source: CaptureSource;
    readonly visible: boolean;
    readonly onSeek?: (passage: TextAnchor) => void;
    readonly notice?: Snippet;
    readonly tagNotice?: Snippet;
  };

  let {
    view,
    listing,
    environment,
    direction,
    language,
    source,
    visible,
    onSeek,
    notice,
    tagNotice,
  }: Props = $props();

  const uid = $props.id();

  const drafts = $derived(view.drafts);

  const search = createCaptureSearch();
  const sorting = createCaptureSort();
  const reveal = createCardReveal();
  const selection = createTagSelection();
  const copying = createTextCopy(
    (text) => environment.write(text),
    (message) => environment.notify(message),
  );
  const confirm = createClearConfirm();
  const capturesExport = new BookCapturesExport({
    exportBookCaptures: (id) => environment.exporting.exportBookCaptures(id),
  });

  const listed = $derived(panelCapturesOf(listing, view.recording.unsaved.cards));
  const lookup: CaptureLookup = {
    get cards() {
      return listed;
    },
    stored: (id) => storedIn(listing, id),
  };

  const writing: TagWriting = {
    tagsOn: (id) => listed.find((capture) => capture.id === id)?.tagIds ?? [],
    loadCounts: () => environment.counting.ask(),
    add: (id, tag) => view.tagging.addTag(id, tag, lookup),
    remove: (id, tag) => view.tagging.removeTag(id, tag, lookup),
    create: (id, name) => view.tagging.createTag(id, name, lookup),
  };

  let list = $state<HTMLElement | null>();

  const cardSource = $derived<CardSource>({
    captures: listed,
    newestFirst: newestFirstOf(listed),
    tags: listing.tags,
    book: view.book,
    language,
    progress: view.warmup.progress,
    direction,
    passages: environment.passages,
    seekable: source === 'text',
  });
  const mismatch = $derived(engineMismatch(view.warmup.session, language));
  const announcement = $derived(announcementOf(listed, view.warmup.progress));
  const ordered = $derived(orderedCaptures(cardSource, sorting.sort));
  const hits = $derived(searchHits(ordered, search.wanted));
  const cards = $derived(cardsOf(cardSource, ordered, hits, search.wanted));
  const cursor = $derived(cursorOf(search.stepped, search.wanted));
  const searching = $derived(search.searching);
  const steps = $derived(searchSteps(cursor, cards.length, listed.length));
  const warning = $derived(confirm.confirming ? clearWarning(clearScope(listed)) : null);
  const tagging = $derived(taggingCard(cards, selection.picker.capture));
  const pickerRows = $derived(
    rowsFor(
      { tags: listing.tags, counts: environment.counting.counts() },
      selection.picker.capture,
      selection.picker.carried,
      selection.picker.query,
    ),
  );
  const stepping = $derived<StepperSteps | null>(
    searching
      ? {
          previous: steps.previous ? () => stepBy(-1) : null,
          next: steps.next ? () => stepBy(1) : null,
          count: steps.tally,
        }
      : null,
  );

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

  function jumpTo(at: number): CardJump {
    const jump = jumpAt(cards, at, cursor);
    if (jump.kind !== 'nowhere') search.stepTo(at);
    return jump;
  }

  function follow(event: MouseEvent, at: number): void {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const jump = jumpTo(at);
    if (jump.kind === 'nowhere') return;

    event.preventDefault();
    navigate(jump);
  }

  function stepBy(by: number): void {
    navigate(jumpTo(cursor + by));
  }

  function stepOnEnter(event: KeyboardEvent): void {
    if (isComposingKey(event)) return;
    if (event.key !== 'Enter') return;

    event.preventDefault();
    stepBy(1);
  }

  async function restore(from: FocusTarget | null): Promise<void> {
    await tick();
    from?.focus();
  }

  function openDraft(field: DraftField, card: Card, from: FocusTarget | null): void {
    drafts.open(field, card.id, writtenIn(field, card), from);
  }

  async function save(field: DraftField, capture: CaptureId): Promise<void> {
    const saved = await drafts.save(field, capture, (written) =>
      match(field)
        .with('text', () => view.edits.edit(capture, written, lookup))
        .with('note', () => view.edits.annotate(capture, written, lookup))
        .exhaustive(),
    );
    if (saved.kind === 'closed') await restore(saved.from);
  }

  async function removeStored(capture: CaptureId): Promise<void> {
    view.recording.unsaved.drop(capture);
    const removed = await view.removal.remove(capture, lookup);
    if (removed === 'saved') drafts.forget(capture);
  }

  async function remove(capture: CaptureId): Promise<void> {
    if (selection.opened(capture)) selection.close();
    const removed = removeStored(capture);
    await tick();
    list?.focus({ preventScroll: true });
    await removed;
  }

  function revealIfLatest(id: CaptureId): Attachment<HTMLElement> {
    return (node) => {
      if (reveal.reveals(id, view.recording.unsaved.latest, visible))
        node.scrollIntoView({ block: 'nearest' });
    };
  }

  function askToClear(): void {
    if (listed.length === 0) return;

    confirm.ask();
    if (view.book !== null) void capturesExport.prepare(view.book);
  }

  async function clearAll(): Promise<void> {
    confirm.dismiss();
    await view.clearAll.clear(view.book);
  }
</script>

<section class="col gap-0 flex-1 min-h-0 min-w-0" aria-labelledby="{uid}-name">
  <header class="row items-center gap-2 px-3 py-2 border-b shrink-0">
    <h2 class="m-0 text-sm weight-semibold" id="{uid}-name">Captures</h2>
    <Badge>{listed.length}</Badge>
    <kbd class="ms-auto" title="Find in captures">⌘K</kbd>
    <DocumentTags tags={listing.tags} counts={tagCounts(listed)} />
    <Dropdown
      variant="ghost"
      size="sm"
      align="end"
      square
      chevron={false}
      icon={ArrowUpDown}
      label={CAPTURE_SORT_LABEL}
    >
      {#each CAPTURE_SORTS as choice (choice)}
        <DropdownItem selected={sorting.sort === choice} onclick={() => sorting.sortBy(choice)}>
          {captureSortName(choice)}
        </DropdownItem>
      {/each}
    </Dropdown>
    <Dropdown
      variant="ghost"
      size="sm"
      align="end"
      square
      chevron={false}
      icon={Ellipsis}
      label="Captures menu"
    >
      <DropdownItem danger disabled={listed.length === 0} onclick={askToClear}>
        Delete every capture…
      </DropdownItem>
    </Dropdown>
  </header>

  <p class="visually-hidden" role="status">{announcement}</p>
  <p class="visually-hidden" role="status">{copying.told}</p>

  <div class="col gap-0 flex-1 min-h-0 overflow-y-auto relative" bind:this={list} tabindex="-1">
    <CaptureListData
      state={listing.state}
      {cards}
      invitation={emptyPanelText(source, searching)}
      onretry={() => listing.reload()}
    >
      {#snippet above()}
        {#if listed.length > 0}
          <Stepper
            steps={stepping}
            axis="block"
            countAs="status"
            spaced
            previousLabel="Previous match"
            nextLabel="Next match"
            class="gap-1"
          >
            <SearchField
              bind:value={() => search.query, (next) => search.setQuery(next)}
              label="Search this book's captures and notes"
              hideLabel
              class="flex-fill min-w-0"
              placeholder="Search captures and notes…"
              title="Search this book's captures and notes · Enter steps to the next match"
              onkeydown={stepOnEnter}
            />
          </Stepper>
        {/if}

        {#if mismatch !== null}
          <Alert variant="warning">{mismatch}</Alert>
        {/if}

        {@render notice?.()}
      {/snippet}

      {#snippet children(shown)}
        <ul class="col gap-2 list-reset" aria-label="Captures in this book">
          {#each shown as card, order (card.id)}
            <li {@attach revealIfLatest(card.id)}>
              <CaptureCard
                {card}
                {language}
                current={searching && order === cursor}
                {drafts}
                copied={copying.copied === card.id}
                onseek={onSeek}
                onfollow={(event) => follow(event, order)}
                onwrite={(field, from) => openDraft(field, card, from)}
                onsave={(field) => void save(field, card.id)}
                onabandon={(field) => void restore(drafts.abandon(field, card.id))}
                ontag={(from) => selection.open(card.id, writing, from)}
                oncopy={(text) => void copying.copy(card.id, text)}
                onremove={(capture) => void remove(capture)}
              />
            </li>
          {/each}
        </ul>
      {/snippet}
    </CaptureListData>
  </div>
</section>

{#if tagging !== null}
  {@const held = tagging}
  <TagPickerModal
    open
    picker={selection.picker}
    rows={pickerRows}
    place={held.place}
    chips={held.tags}
    onchoose={(row) => void selection.choose(row, writing)}
    onuntag={(tag) => void view.tagging.removeTag(held.id, tag, lookup)}
    onclose={() => void restore(selection.close())}
    notice={tagNotice}
  />
{/if}

<Modal
  open={warning !== null}
  title="Delete every capture"
  size="sm"
  onclose={() => confirm.dismiss()}
>
  <p class="m-0">{warning}</p>
  <BookCapturesExportButton view={capturesExport} />
  {#snippet footer(close)}
    <Button variant="ghost" onclick={close}>Keep them</Button>
    <Button variant="danger" onclick={() => void clearAll()}>
      <Trash class="btn-icon" />
      Delete
    </Button>
  {/snippet}
</Modal>
