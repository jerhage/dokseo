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
  import BookCapturesExportButton from '$lib/shared/BookCapturesExportButton.svelte';
  import { isComposingKey } from '$lib/shared/composing-key';
  import type { CaptureId } from '$lib/shared/ids';
  import type { Language } from '$lib/shared/language';
  import { createCaptureSearch } from './capture-search.svelte';
  import { cardsOf, cursorOf, jumpAt, orderedCaptures, searchHits } from './capture-card-rules';
  import type { CardJump } from './capture-card-rules';
  import type { CapturePanelView } from './capture-panel.svelte';
  import type { CaptureView } from './capture-view.svelte';
  import { createCaptureSort } from './capture-sort-choice.svelte';
  import { CAPTURE_SORTS, CAPTURE_SORT_LABEL, captureSortName } from './capture-sort';
  import { createCardReveal } from './card-reveal';
  import { clearWarning } from './clearing';
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
    readonly panel: CapturePanelView;
    readonly language: Language | null;
    readonly source: CaptureSource;
    readonly visible: boolean;
    readonly onSeek?: (passage: TextAnchor) => void;
    readonly notice?: Snippet;
    readonly tagNotice?: Snippet;
  };

  let { view, panel, language, source, visible, onSeek, notice, tagNotice }: Props = $props();

  const uid = $props.id();

  const drafts = $derived(view.drafts);

  const search = createCaptureSearch();
  const sorting = createCaptureSort();
  const reveal = createCardReveal();
  const selection = createTagSelection();
  const copying = createTextCopy(
    (text) => panel.write(text),
    (message) => panel.notify(message),
  );
  const confirm = createClearConfirm();

  const writing: TagWriting = {
    tagsOn: (id) => view.list.captures.find((capture) => capture.id === id)?.tagIds ?? [],
    loadCounts: () => panel.counting.ask(),
    add: (id, tag) => view.tagging.addTag(id, tag),
    remove: (id, tag) => view.tagging.removeTag(id, tag),
    create: (id, name) => view.tagging.createTag(id, name),
  };

  let list = $state<HTMLElement | null>();

  const cardSource = $derived(panel.cardSource);
  const ordered = $derived(orderedCaptures(cardSource, sorting.sort));
  const hits = $derived(searchHits(ordered, search.wanted));
  const cards = $derived(cardsOf(cardSource, ordered, hits, search.wanted));
  const cursor = $derived(cursorOf(search.stepped, search.wanted));
  const searching = $derived(search.searching);
  const steps = $derived(searchSteps(cursor, cards.length, view.list.count));
  const warning = $derived(confirm.confirming ? clearWarning(view.clearAll.scope) : null);
  const tagging = $derived(cards.find((card) => card.id === selection.picker.capture) ?? null);
  const pickerRows = $derived(
    rowsFor(
      { tags: view.tagging.tags, counts: panel.counting.counts() },
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

  async function save(field: DraftField, capture: CaptureId): Promise<void> {
    const saved = await panel.save(field, capture);
    if (saved.kind === 'closed') await restore(saved.from);
  }

  async function remove(capture: CaptureId): Promise<void> {
    if (selection.opened(capture)) selection.close();
    const removed = panel.remove(capture);
    await tick();
    list?.focus({ preventScroll: true });
    await removed;
  }

  function revealIfLatest(id: CaptureId): Attachment<HTMLElement> {
    return (node) => {
      if (reveal.reveals(id, view.list.latest, visible)) node.scrollIntoView({ block: 'nearest' });
    };
  }

  function askToClear(): void {
    if (view.list.count === 0) return;

    confirm.ask();
    view.clearAll.prepareExport();
  }

  async function clearAll(): Promise<void> {
    confirm.dismiss();
    await view.clearAll.clear();
  }
</script>

<section class="col gap-0 flex-1 min-h-0 min-w-0" aria-labelledby="{uid}-name">
  <header class="row items-center gap-2 px-3 py-2 border-b shrink-0">
    <h2 class="m-0 text-sm weight-semibold" id="{uid}-name">Captures</h2>
    <Badge>{view.list.count}</Badge>
    <kbd class="ms-auto" title="Find in captures">⌘K</kbd>
    <DocumentTags tags={view.tagging.tags} counts={view.tagging.bookCounts} />
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
      <DropdownItem danger disabled={view.list.count === 0} onclick={askToClear}>
        Delete every capture…
      </DropdownItem>
    </Dropdown>
  </header>

  <p class="visually-hidden" role="status">{panel.announcement}</p>
  <p class="visually-hidden" role="status">{copying.told}</p>

  <div class="col gap-0 flex-1 min-h-0 overflow-y-auto relative" bind:this={list} tabindex="-1">
    <CaptureListData
      state={view.list.listing.state}
      {cards}
      invitation={emptyPanelText(source, searching)}
      onretry={() => view.list.listing.reload()}
    >
      {#snippet above()}
        {#if view.list.count > 0}
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

        {#if panel.mismatch !== null}
          <Alert variant="warning">{panel.mismatch}</Alert>
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
                onwrite={(field, from) => panel.openDraft(field, card, from)}
                onsave={(field) => void save(field, card.id)}
                onabandon={(field) => void restore(panel.abandon(field, card.id))}
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
    onuntag={(tag) => void view.tagging.removeTag(held.id, tag)}
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
  <BookCapturesExportButton view={view.clearAll.capturesExport} />
  {#snippet footer(close)}
    <Button variant="ghost" onclick={close}>Keep them</Button>
    <Button variant="danger" onclick={() => void clearAll()}>
      <Trash class="btn-icon" />
      Delete
    </Button>
  {/snippet}
</Modal>
