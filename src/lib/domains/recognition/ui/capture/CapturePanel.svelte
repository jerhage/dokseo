<script lang="ts">
  import { tick } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import { match } from 'ts-pattern';
  import { goto } from '$app/navigation';
  import Alert from '$lib/components/Alert.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Dropdown from '$lib/components/Dropdown.svelte';
  import DropdownItem from '$lib/components/DropdownItem.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import SearchField from '$lib/components/SearchField.svelte';
  import Stepper from '$lib/components/Stepper.svelte';
  import type { StepperSteps } from '$lib/components/stepper';
  import ArrowUpDown from '$lib/components/icons/ArrowUpDown.svelte';
  import Ellipsis from '$lib/components/icons/Ellipsis.svelte';
  import Trash from '$lib/components/icons/Trash.svelte';
  import type { TextAnchor } from '$lib/shared/anchor';
  import { isComposingKey } from '$lib/shared/composing-key';
  import type { CaptureId } from '$lib/shared/ids';
  import type { Language } from '$lib/shared/language';
  import type { ReadingDirection } from '$lib/shared/layout-kind';
  import type { Notify } from '$lib/shared/notice';
  import type { PassageOrder } from '../../domain/capture/capture-order';
  import type { FocusTarget } from './card-editing.svelte';
  import type { CardJump } from './capture-cards.svelte';
  import { CapturePanelView } from './capture-panel.svelte';
  import type { CaptureView } from './capture-view.svelte';
  import { CAPTURE_SORTS, CAPTURE_SORT_LABEL, captureSortName } from './capture-sort';
  import { emptyPanelText } from './empty-panel';
  import type { CaptureSource } from './empty-panel';
  import CaptureCard from './CaptureCard.svelte';
  import CaptureListData from './CaptureListData.svelte';
  import type { DraftField } from './card-drafts.svelte';
  import DocumentTags from './DocumentTags.svelte';
  import TagPickerModal from './TagPickerModal.svelte';
  import type { ClipboardWrite } from './text-copy.svelte';

  type Props = {
    readonly view: CaptureView;
    readonly language: Language | null;
    readonly direction: ReadingDirection;
    readonly passages: PassageOrder;
    readonly source: CaptureSource;
    readonly visible: boolean;
    readonly copyText: ClipboardWrite;
    readonly notify: Notify;
    readonly onSeek?: (passage: TextAnchor) => void;
  };

  let { view, language, direction, passages, source, visible, copyText, notify, onSeek }: Props =
    $props();

  const uid = $props.id();

  const panel = new CapturePanelView(
    () => ({ view, language, direction, passages, seekable: onSeek !== undefined }),
    (text) => copyText(text),
    (notice) => notify(notice),
  );

  const drafts = $derived(view.drafts);

  let list = $state<HTMLElement | null>();

  const cards = $derived(panel.cards.cards);
  const searching = $derived(panel.cards.searching);
  const stepping = $derived<StepperSteps | null>(
    searching
      ? {
          previous: panel.steps.previous ? () => stepBy(-1) : null,
          next: panel.steps.next ? () => stepBy(1) : null,
          count: panel.steps.tally,
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

  function follow(event: MouseEvent, at: number): void {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const jump = panel.cards.jumpTo(at);
    if (jump.kind === 'nowhere') return;

    event.preventDefault();
    navigate(jump);
  }

  function stepBy(by: number): void {
    navigate(panel.stepBy(by));
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
    const removed = panel.remove(capture);
    await tick();
    list?.focus({ preventScroll: true });
    await removed;
  }

  function revealIfLatest(id: CaptureId): Attachment<HTMLElement> {
    return (node) => {
      if (panel.reveals(id, visible)) node.scrollIntoView({ block: 'nearest' });
    };
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
        <DropdownItem
          selected={panel.cards.sort === choice}
          onclick={() => panel.cards.sortBy(choice)}
        >
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
      <DropdownItem danger disabled={view.list.count === 0} onclick={() => view.clearAll.ask()}>
        Delete every capture…
      </DropdownItem>
    </Dropdown>
  </header>

  <p class="visually-hidden" role="status">{panel.announcement}</p>
  <p class="visually-hidden" role="status">{panel.copying.told}</p>

  <div class="col gap-0 flex-1 min-h-0 overflow-y-auto relative" bind:this={list} tabindex="-1">
    <CaptureListData
      state={view.list.state}
      {cards}
      invitation={emptyPanelText(source, searching)}
      onretry={() => void view.list.reload()}
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
              bind:value={panel.cards.query}
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
      {/snippet}

      {#snippet children(shown)}
        <ul class="col gap-2 list-reset" aria-label="Captures in this book">
          {#each shown as card, order (card.id)}
            <li {@attach revealIfLatest(card.id)}>
              <CaptureCard
                {card}
                {language}
                current={searching && order === panel.cards.cursor}
                {drafts}
                copied={panel.copying.copied === card.id}
                onseek={onSeek}
                onfollow={(event) => follow(event, order)}
                onwrite={(field, from) => panel.openDraft(field, card, from)}
                onsave={(field) => void save(field, card.id)}
                onabandon={(field) => void restore(panel.abandon(field, card.id))}
                ontag={(from) => panel.openTags(card.id, from)}
                oncopy={(text) => void panel.copying.copy(card.id, text)}
                onremove={(capture) => void remove(capture)}
              />
            </li>
          {/each}
        </ul>
      {/snippet}
    </CaptureListData>
  </div>
</section>

{#if panel.tagging !== null}
  {@const held = panel.tagging}
  <TagPickerModal
    open
    picker={panel.selection.picker}
    place={held.place}
    chips={held.tags}
    onchoose={(row) => void panel.selection.choose(row)}
    onuntag={(tag) => void panel.selection.drop(held.id, tag)}
    onclose={() => void restore(panel.closeTags())}
  />
{/if}

<Modal
  open={panel.warning !== null}
  title="Delete every capture"
  size="sm"
  onclose={() => view.clearAll.dismiss()}
>
  <p class="m-0">{panel.warning}</p>
  {#snippet footer(close)}
    <Button variant="ghost" onclick={close}>Keep them</Button>
    <Button variant="danger" onclick={() => void view.clearAll.clear()}>
      <Trash class="btn-icon" />
      Delete
    </Button>
  {/snippet}
</Modal>
