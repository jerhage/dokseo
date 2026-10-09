<script lang="ts">
  import type { Snippet } from 'svelte';
  import { match } from 'ts-pattern';
  import Alert from '$lib/ui/components/Alert.svelte';
  import Badge from '$lib/ui/components/Badge.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import CommandItem from '$lib/ui/components/CommandItem.svelte';
  import EmptyState from '$lib/ui/components/EmptyState.svelte';
  import type { KeyHint } from '$lib/ui/components/key-hints';
  import KeyHints from '$lib/ui/components/KeyHints.svelte';
  import ListGroup from '$lib/ui/components/ListGroup.svelte';
  import OverflowList from '$lib/ui/components/OverflowList.svelte';
  import Tag from '$lib/ui/components/Tag.svelte';
  import Thumbnail from '$lib/ui/components/Thumbnail.svelte';
  import type { BookId, TagId } from '$lib/shared/ids';
  import type { ReadState } from '$lib/shared/read-state';
  import { tagsHref } from '$lib/shared/tag-location';
  import type { PassageOrder } from '../../domain/capture/capture-order';
  import type { SearchedBook } from '../../domain/capture/capture-results';
  import { clampedIndex, NO_MATCH } from '../../domain/capture/match-stepping';
  import { CHIPS_ON_A_CARD } from '../capture/chip-line';
  import {
    addedText,
    neighboursOf,
    shelvedRows,
    summaryText,
    tagStage,
    taggedCount,
    taggedShelves,
    walkKey,
  } from './tag-screen';
  import { tagViewOf, taggedGroupsOf } from './tag-view-rules';
  import type { TaggedCaptures } from './tag-view-rules';
  import TagsShell from './TagsShell.svelte';

  type Props = {
    readonly tagged: ReadState<TaggedCaptures>;
    readonly books: readonly SearchedBook[];
    readonly wanted: string | null;
    readonly passages: PassageOrder;
    readonly covers: ReadonlyMap<BookId, string>;
    readonly libraryFailure: string | null;
    readonly onretrylibrary: () => void;
    readonly notice?: Snippet;
  };

  type Walk = { readonly tag: TagId | null; readonly at: number };

  const TAG_SCREEN_KEYS: readonly KeyHint[] = [
    { keys: ['↑↓'], does: 'move' },
    { keys: ['↵'], does: 'jump' },
    { keys: ['⌘↵'], does: 'new tab' },
  ];

  let { tagged, books, wanted, passages, covers, libraryFailure, onretrylibrary, notice }: Props =
    $props();

  let filter = $state('');
  let walk = $state.raw<Walk | null>(null);
  let anchors = $state<(HTMLElement | null | undefined)[]>([]);

  const read = $derived(tagViewOf({ books, wanted, tagged }, filter));
  const groups = $derived(taggedGroupsOf(read, books, passages));

  const stage = $derived(
    tagStage({
      tag: read.chosen === null ? undefined : read.tagsById.get(read.chosen),
      summary: read.summary,
      tags: read.tags.length,
      status: read.status,
      libraryFailed: libraryFailure !== null,
    }),
  );

  const shelves = $derived(
    taggedShelves({
      groups: groups,
      covers,
      chosen: read.chosen,
      tags: read.tags,
      now: Date.now(),
    }),
  );

  const rows = $derived(shelvedRows(shelves));

  const neighbours = $derived(neighboursOf(read.also, read.tagsById));

  const cursor = $derived(walk !== null && walk.tag === read.chosen ? walk.at : NO_MATCH);

  function moveBy(by: number): void {
    const at = clampedIndex(cursor, by, rows.length);
    if (at === NO_MATCH) return;

    walk = { tag: read.chosen, at };
    anchors[at]?.scrollIntoView({ block: 'nearest' });
    anchors[at]?.focus({ preventScroll: true });
  }

  function typing(target: EventTarget | null): boolean {
    return (
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof Element && target.closest('dialog') !== null)
    );
  }

  function keys(event: KeyboardEvent): void {
    if (typing(event.target)) return;

    const row = rows[cursor];
    const pressed = walkKey(event, rows.length, cursor);
    if (pressed.kind === 'none') return;

    event.preventDefault();
    match(pressed)
      .with({ kind: 'move' }, (step) => moveBy(step.by))
      .with({ kind: 'open' }, () => anchors[cursor]?.click())
      .with({ kind: 'open-in-new-tab' }, () => {
        if (row !== undefined) window.open(row.href, '_blank', 'noopener');
      })
      .exhaustive();
  }
</script>

<svelte:window onkeydown={keys} />

<TagsShell {read} current="tags" bind:filter>
  {#snippet children(showList)}
    {#if read.status === 'failed'}
      <Alert variant="danger" role="alert">Your tags could not be read.</Alert>
    {/if}

    {#if libraryFailure !== null}
      <Alert variant="danger" role="alert" title="Your library could not be read">
        {libraryFailure}
        {#snippet actions()}
          <Button size="sm" onclick={onretrylibrary}>Try again</Button>
        {/snippet}
      </Alert>
    {/if}

    {@render notice?.()}

    {#if stage.kind === 'loading'}
      <EmptyState live message="Reading your tags…" />
    {:else if stage.kind === 'no-tags'}
      <EmptyState
        message="No tags yet. Tag a capture from the capture panel in the reader and it appears here."
      />
    {:else if stage.kind === 'unchosen'}
      <EmptyState message="No tag chosen. Pick one from the list to see everything carrying it.">
        {#snippet action()}
          <Button class="layout-app-shell-narrow-only" aria-haspopup="dialog" onclick={showList}>
            Choose a tag
          </Button>
        {/snippet}
      </EmptyState>
    {:else if stage.kind === 'unshelved'}
      <h1 class="row items-center gap-2 text-lg min-w-0">
        <Badge color={stage.tag.colour} emphasis="quiet" dot aria-hidden="true" />
        <span class="truncate">{stage.tag.name}</span>
      </h1>
    {:else}
      {@const added = addedText(stage.summary, Date.now())}
      <header class="col gap-1">
        <h1 class="row items-center gap-2 text-lg min-w-0">
          <Badge color={stage.tag.colour} emphasis="quiet" dot aria-hidden="true" />
          <span class="truncate">{stage.tag.name}</span>
        </h1>
        <p class="text-sm text-muted">
          {summaryText(stage.summary)}{#if added !== null}
            <span class="mx-1" aria-hidden="true">·</span>{added}{/if}
        </p>
      </header>

      {#if stage.kind === 'empty'}
        <EmptyState
          message="Nothing carries {stage.tag
            .name} any more. Tag a capture in the reader to fill this in."
        />
      {:else}
        {#if neighbours.length > 0}
          <section class="col gap-2" aria-label="Also tagged">
            <p class="eyebrow text-faint">Also tagged</p>
            <ul class="row wrap items-center gap-2 list-reset">
              {#each neighbours as other (other.id)}
                <li class="row min-w-0">
                  <Tag href={tagsHref(other.name)} color={other.colour} class="min-w-0">
                    <span class="truncate">{other.name}</span>
                    <span class="text-xs mono">{other.count}</span>
                  </Tag>
                </li>
              {/each}
            </ul>
          </section>
        {/if}

        <ul class="col gap-6 list-reset">
          {#each shelves as shelf (shelf.id)}
            <li class="col gap-3">
              <div class="row items-center gap-3">
                <Thumbnail src={shelf.cover} size="md" />
                <div class="col gap-0 flex-1">
                  <h2 class="text-base weight-semibold truncate" lang={shelf.language}>
                    {shelf.title}
                  </h2>
                  <span class="text-xs text-muted">{taggedCount(shelf.rows.length)}</span>
                </div>
                <Button href="/read/{shelf.id}" variant="ghost" size="sm" class="shrink-0">
                  Open document
                </Button>
              </div>
              <ListGroup variant="inset">
                {#each shelf.rows as row (row.id)}
                  <li>
                    <CommandItem
                      bind:ref={anchors[row.order]}
                      href={row.href}
                      selected={row.order === cursor}
                      class="items-start"
                      onfocus={() => (walk = { tag: read.chosen, at: row.order })}
                    >
                      <span class="col gap-1 flex-1">
                        <span class="text-base" lang={shelf.language}>{row.text}</span>
                        <span class="row wrap items-center gap-2 text-xs text-muted">
                          <span class="mono truncate min-w-0" lang={row.placeLanguage}
                            >{row.place}</span
                          >
                          {#if row.when !== null}
                            <span>{row.when}</span>
                          {/if}
                          <OverflowList
                            inline
                            items={row.chips}
                            room={CHIPS_ON_A_CARD}
                            name={(chip) => chip.name}
                            key={(chip) => chip.id}
                          >
                            {#snippet item(chip)}
                              <Badge color={chip.colour} emphasis="quiet" dot>{chip.name}</Badge>
                            {/snippet}
                          </OverflowList>
                        </span>
                      </span>
                      <span class="visually-hidden">{row.jump}</span>
                    </CommandItem>
                  </li>
                {/each}
              </ListGroup>
            </li>
          {/each}
        </ul>

        <KeyHints hints={TAG_SCREEN_KEYS} element="footer" class="gap-4" />
      {/if}
    {/if}
  {/snippet}
</TagsShell>
