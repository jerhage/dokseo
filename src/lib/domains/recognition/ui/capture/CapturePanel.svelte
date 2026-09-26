<script lang="ts">
  import { tick } from 'svelte';
  import { match } from 'ts-pattern';
  import { goto } from '$app/navigation';
  import Alert from '$lib/components/Alert.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Dropdown from '$lib/components/Dropdown.svelte';
  import DropdownItem from '$lib/components/DropdownItem.svelte';
  import Input from '$lib/components/Input.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
  import ChevronUp from '$lib/components/icons/ChevronUp.svelte';
  import Ellipsis from '$lib/components/icons/Ellipsis.svelte';
  import Trash from '$lib/components/icons/Trash.svelte';
  import type { TextAnchor } from '$lib/shared/anchor';
  import type { CaptureId } from '$lib/shared/ids';
  import type { Language } from '$lib/shared/language';
  import type { ReadingDirection } from '$lib/shared/layout-kind';
  import { engineMismatch } from '../../domain/engine/ocr-engine';
  import { modelLoadAnnouncement } from '../engine/recognizer-view.svelte';
  import type { FocusTarget } from './card-editing.svelte';
  import { CaptureCards } from './capture-cards.svelte';
  import type { Card, CardJump } from './capture-cards.svelte';
  import type { CaptureView } from './capture-view.svelte';
  import { clearWarning } from './clearing';
  import { TagSelection } from './tag-selection.svelte';
  import CaptureCard from './CaptureCard.svelte';
  import { CardDrafts } from './card-drafts.svelte';
  import type { DraftField } from './card-drafts.svelte';
  import DocumentTags from './DocumentTags.svelte';
  import TagPickerModal from './TagPickerModal.svelte';
  import { searchSteps } from './panel-search';

  type Props = {
    readonly view: CaptureView;
    readonly language: Language | null;
    readonly direction: ReadingDirection;
    readonly onSeek?: (passage: TextAnchor) => void;
  };

  let { view, language, direction, onSeek }: Props = $props();

  const COPIED_FOR = 1500;

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

  const drafts = new CardDrafts();

  let list = $state<HTMLElement>();
  let copied = $state<CaptureId | null>(null);
  let told = $state('');
  let tagFrom: FocusTarget | null = null;

  $effect(() => {
    const fresh = view.writing;
    if (fresh === null) return;

    view.takeWriting();
    drafts.open('text', fresh, '', null);
  });

  const mismatch = $derived(engineMismatch(view.session, language));
  const waiting = $derived(view.captures.some((capture) => capture.status === 'pending'));
  const announcement = $derived(waiting ? modelLoadAnnouncement(view.progress) : '');
  const cards = $derived(panel.cards);
  const searching = $derived(panel.searching);
  const steps = $derived(searchSteps(panel.cursor, cards.length, view.count));
  const warning = $derived(view.confirmingClear ? clearWarning(view.clearing) : null);
  const tagging = $derived(cards.find((card) => card.id === selection.picker.capture) ?? null);

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

  function openDraft(field: DraftField, card: Card, from: FocusTarget | null): void {
    const written = field === 'note' ? (card.annotation ?? '') : (card.text ?? '');
    drafts.open(field, card.id, written, from);
  }

  function abandon(field: DraftField, capture: CaptureId): void {
    void restore(drafts.abandon(field, capture));
  }

  function save(field: DraftField, capture: CaptureId): void {
    const kept = drafts.save(field, capture);
    if (kept === null) return;

    void restore(kept.from);
    void match(kept.field)
      .with('text', () => view.edit(kept.capture, kept.written))
      .with('note', () => view.annotate(kept.capture, kept.written))
      .exhaustive();
  }

  async function remove(capture: CaptureId): Promise<void> {
    drafts.forget(capture);
    if (selection.opened(capture)) selection.close();
    await view.remove(capture);
    await tick();
    list?.focus({ preventScroll: true });
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

  async function copy(capture: CaptureId, text: string): Promise<void> {
    const done = await navigator.clipboard.writeText(text).then(
      () => true,
      () => false,
    );
    told = done ? 'Copied the text' : 'The text could not be copied';
    if (!done) return;

    copied = capture;
    setTimeout(() => {
      if (copied === capture) copied = null;
    }, COPIED_FOR);
  }
</script>

<section class="col gap-0 flex-1 min-h-0 min-w-0" aria-labelledby="{uid}-name">
  <header class="row items-center gap-2 px-3 py-2 border-b shrink-0">
    <h2 class="m-0 text-sm weight-semibold" id="{uid}-name">Captures</h2>
    <Badge>{view.count}</Badge>
    <kbd class="ms-auto" title="Find in captures">⌘K</kbd>
    <DocumentTags tags={view.tags} counts={view.bookCounts} />
    <Dropdown variant="ghost" size="sm" align="end" square chevron={false}>
      {#snippet trigger()}
        <Ellipsis class="btn-icon" />
        <span class="visually-hidden">Captures menu</span>
      {/snippet}
      <DropdownItem danger disabled={view.count === 0} onclick={() => view.askClear()}>
        Delete every capture…
      </DropdownItem>
    </Dropdown>
  </header>

  <p class="visually-hidden" role="status">{announcement}</p>
  <p class="visually-hidden" role="status">{told}</p>

  <div class="col gap-0 flex-1 min-h-0 overflow-y-auto relative" bind:this={list} tabindex="-1">
    <div class="col gap-2 px-3 pt-3">
      {#if view.count > 0}
        <div class="row items-center gap-1">
          <label class="visually-hidden" for="{uid}-search">
            Search this book's captures and notes
          </label>
          <Input
            bind:value={panel.query}
            id="{uid}-search"
            class="flex-fill min-w-0"
            type="search"
            placeholder="Search captures and notes…"
            title="Search this book's captures and notes · Enter steps to the next match"
            onkeydown={stepOnEnter}
          />
          {#if searching}
            <Button
              variant="ghost"
              size="sm"
              square
              title="Previous match"
              disabled={!steps.previous}
              onclick={() => stepBy(-1)}
            >
              <ChevronUp class="btn-icon" />
              <span class="visually-hidden">Previous match</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              square
              title="Next match"
              disabled={!steps.next}
              onclick={() => stepBy(1)}
            >
              <ChevronDown class="btn-icon" />
              <span class="visually-hidden">Next match</span>
            </Button>
          {/if}
        </div>
        {#if searching}
          <p class="m-0 text-xs text-muted mono" role="status">{steps.tally}</p>
        {/if}
      {/if}

      {#if mismatch !== null}
        <Alert variant="warning">{mismatch}</Alert>
      {/if}
    </div>

    <div class="col gap-2 p-3">
      {#if cards.length === 0}
        <p class="m-0 p-2 text-sm text-muted">
          {searching
            ? 'No capture or note in this book holds that text.'
            : 'Drag a box over a speech bubble and the text arrives here.'}
        </p>
      {:else}
        <ul class="col gap-2 list-reset" aria-label="Captures in this book">
          {#each cards as card, order (card.id)}
            <li>
              <CaptureCard
                {card}
                {language}
                current={searching && order === panel.cursor}
                {drafts}
                copied={copied === card.id}
                onseek={onSeek}
                onfollow={(event) => follow(event, order)}
                onwrite={(field, from) => openDraft(field, card, from)}
                onsave={(field) => save(field, card.id)}
                onabandon={(field) => abandon(field, card.id)}
                ontag={(from) => openTags(card.id, from)}
                oncopy={(text) => void copy(card.id, text)}
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
