<script lang="ts">
  import { tick } from 'svelte';
  import { match } from 'ts-pattern';
  import { goto } from '$app/navigation';
  import Alert from '$lib/components/Alert.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Dropdown from '$lib/components/Dropdown.svelte';
  import DropdownItem from '$lib/components/DropdownItem.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import SearchField from '$lib/components/SearchField.svelte';
  import Stepper from '$lib/components/Stepper.svelte';
  import type { StepperSteps } from '$lib/components/stepper';
  import Ellipsis from '$lib/components/icons/Ellipsis.svelte';
  import Trash from '$lib/components/icons/Trash.svelte';
  import { getToaster } from '$lib/components/toast-context';
  import type { TextAnchor } from '$lib/shared/anchor';
  import { isComposingKey } from '$lib/shared/composing-key';
  import type { CaptureId } from '$lib/shared/ids';
  import type { Language } from '$lib/shared/language';
  import type { ReadingDirection } from '$lib/shared/layout-kind';
  import { toastNotify } from '$lib/shared/notice-toast';
  import { engineMismatch } from '../../domain/engine/ocr-engine';
  import { modelLoadAnnouncement } from '../engine/recognizer-view.svelte';
  import type { FocusTarget } from './card-editing.svelte';
  import { CaptureCards } from './capture-cards.svelte';
  import type { Card, CardJump } from './capture-cards.svelte';
  import type { CaptureView } from './capture-view.svelte';
  import { clearWarning } from './clearing';
  import { TagSelection } from './tag-selection.svelte';
  import CaptureCard from './CaptureCard.svelte';
  import type { DraftField } from './card-drafts.svelte';
  import DocumentTags from './DocumentTags.svelte';
  import TagPickerModal from './TagPickerModal.svelte';
  import { searchSteps } from './panel-search';
  import { TextCopy } from './text-copy.svelte';

  type Props = {
    readonly view: CaptureView;
    readonly language: Language | null;
    readonly direction: ReadingDirection;
    readonly onSeek?: (passage: TextAnchor) => void;
  };

  let { view, language, direction, onSeek }: Props = $props();

  const uid = $props.id();

  const panel = new CaptureCards(() => ({
    captures: view.captures,
    newestFirst: view.newestFirst,
    tags: view.tags,
    book: view.book,
    progress: view.progress,
    direction,
    seekable: onSeek !== undefined,
  }));

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

  const drafts = $derived(view.drafts);

  const copying = new TextCopy(
    (text) => navigator.clipboard.writeText(text),
    toastNotify(getToaster()),
  );

  let list = $state<HTMLElement | null>();
  let tagFrom: FocusTarget | null = null;

  const mismatch = $derived(engineMismatch(view.session, language));
  const waiting = $derived(view.captures.some((capture) => capture.status === 'pending'));
  const announcement = $derived(waiting ? modelLoadAnnouncement(view.progress) : '');
  const cards = $derived(panel.cards);
  const searching = $derived(panel.searching);
  const steps = $derived(searchSteps(panel.cursor, cards.length, view.count));
  const stepping = $derived<StepperSteps | null>(
    searching
      ? {
          previous: steps.previous ? () => stepBy(-1) : null,
          next: steps.next ? () => stepBy(1) : null,
          count: steps.tally,
        }
      : null,
  );
  const warning = $derived(view.confirmingClear ? clearWarning(view.clearing) : null);
  const tagging = $derived(cards.find((card) => card.id === selection.picker.capture) ?? null);
  const loadFailure = $derived(view.load.status === 'failed' ? view.load.message : null);

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
    const written = field === 'note' ? (card.annotation ?? '') : (card.text ?? '');
    drafts.open(field, card.id, written, from);
  }

  function abandon(field: DraftField, capture: CaptureId): void {
    void restore(drafts.abandon(field, capture));
  }

  async function save(field: DraftField, capture: CaptureId): Promise<void> {
    const saved = await drafts.save(field, capture, (written) =>
      match(field)
        .with('text', () => view.edit(capture, written))
        .with('note', () => view.annotate(capture, written))
        .exhaustive(),
    );

    if (saved.kind === 'closed') await restore(saved.from);
  }

  async function remove(capture: CaptureId): Promise<void> {
    if (selection.opened(capture)) selection.close();
    const removed = view.remove(capture);
    await tick();
    list?.focus({ preventScroll: true });
    if ((await removed) === 'saved') drafts.forget(capture);
  }

  function openTags(capture: CaptureId, from: FocusTarget): void {
    tagFrom = from;
    selection.open(capture);
  }

  function closeTags(): void {
    if (selection.picker.capture === null) return;

    selection.close();
    void restore(tagFrom);
    tagFrom = null;
  }
</script>

<section class="col gap-0 flex-1 min-h-0 min-w-0" aria-labelledby="{uid}-name">
  <header class="row items-center gap-2 px-3 py-2 border-b shrink-0">
    <h2 class="m-0 text-sm weight-semibold" id="{uid}-name">Captures</h2>
    <Badge>{view.count}</Badge>
    <kbd class="ms-auto" title="Find in captures">⌘K</kbd>
    <DocumentTags tags={view.tags} counts={view.bookCounts} />
    <Dropdown
      variant="ghost"
      size="sm"
      align="end"
      square
      chevron={false}
      icon={Ellipsis}
      label="Captures menu"
    >
      <DropdownItem danger disabled={view.count === 0} onclick={() => view.askClear()}>
        Delete every capture…
      </DropdownItem>
    </Dropdown>
  </header>

  <p class="visually-hidden" role="status">{announcement}</p>
  <p class="visually-hidden" role="status">{copying.told}</p>

  <div class="col gap-0 flex-1 min-h-0 overflow-y-auto relative" bind:this={list} tabindex="-1">
    <div class="col gap-2 px-3 pt-3">
      {#if view.count > 0}
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
            bind:value={panel.query}
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

      {#if loadFailure !== null}
        <Alert variant="danger" title="Your captures could not be loaded">
          {loadFailure}
          {#snippet actions()}
            <Button size="sm" onclick={() => void view.reload()}>Try again</Button>
          {/snippet}
        </Alert>
      {/if}
    </div>

    <div class="col gap-2 p-3">
      {#if cards.length === 0}
        {#if loadFailure === null}
          <EmptyState
            class="p-2"
            message={searching
              ? 'No capture or note in this book holds that text.'
              : 'Drag a box over a speech bubble and the text arrives here.'}
          />
        {/if}
      {:else}
        <ul class="col gap-2 list-reset" aria-label="Captures in this book">
          {#each cards as card, order (card.id)}
            <li>
              <CaptureCard
                {card}
                {language}
                current={searching && order === panel.cursor}
                {drafts}
                copied={copying.copied === card.id}
                onseek={onSeek}
                onfollow={(event) => follow(event, order)}
                onwrite={(field, from) => openDraft(field, card, from)}
                onsave={(field) => void save(field, card.id)}
                onabandon={(field) => abandon(field, card.id)}
                ontag={(from) => openTags(card.id, from)}
                oncopy={(text) => void copying.copy(card.id, text)}
                onremove={(capture) => void remove(capture)}
              />
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
</section>

{#if tagging !== null}
  {@const held = tagging}
  <TagPickerModal
    open
    picker={selection.picker}
    place={held.place}
    chips={held.tags}
    onchoose={(row) => void selection.choose(row)}
    onuntag={(tag) => void selection.drop(held.id, tag)}
    onclose={closeTags}
  />
{/if}

<Modal
  open={warning !== null}
  title="Delete every capture"
  size="sm"
  onclose={() => view.dismissClear()}
>
  <p class="m-0">{warning}</p>
  {#snippet footer(close)}
    <Button variant="ghost" onclick={close}>Keep them</Button>
    <Button variant="danger" onclick={() => void view.clear()}>
      <Trash class="btn-icon" />
      Delete
    </Button>
  {/snippet}
</Modal>
