<script lang="ts">
  import { match } from 'ts-pattern';
  import Alert from '$lib/components/Alert.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import CommandItem from '$lib/components/CommandItem.svelte';
  import type { KeyHint } from '$lib/components/key-hints';
  import KeyHints from '$lib/components/KeyHints.svelte';
  import Tag from '$lib/components/Tag.svelte';
  import type { BookId, TagId } from '$lib/shared/ids';
  import { tagsHref } from '$lib/shared/tag-location';
  import { clampedIndex, NO_MATCH } from '../../domain/capture/match-stepping';
  import { chipLine } from '../capture/chip-line';
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
  import type { Shelf } from './tag-screen';
  import type { TagView } from './tag-view.svelte';
  import TagsShell from './TagsShell.svelte';

  type Props = {
    readonly view: TagView;
    readonly covers: ReadonlyMap<BookId, string>;
    readonly shelf: Shelf;
  };

  type Walk = { readonly tag: TagId | null; readonly at: number };

  const TAG_SCREEN_KEYS: readonly KeyHint[] = [
    { keys: ['↑↓'], does: 'move' },
    { keys: ['↵'], does: 'jump' },
    { keys: ['⌘↵'], does: 'new tab' },
  ];

  let { view, covers, shelf }: Props = $props();

  let walk = $state.raw<Walk | null>(null);
  let anchors = $state<(HTMLElement | undefined)[]>([]);

  const stage = $derived(
    tagStage({
      tag: view.chosen === null ? undefined : view.tagsById.get(view.chosen),
      summary: view.summary,
      tags: view.tags.length,
      status: view.status,
      shelf: shelf.status,
    }),
  );

  const shelves = $derived(
    taggedShelves({
      groups: view.groups,
      covers,
      chosen: view.chosen,
      tags: view.tags,
      now: Date.now(),
    }),
  );

  const rows = $derived(shelvedRows(shelves));

  const neighbours = $derived(neighboursOf(view.also, view.tagsById));

  const cursor = $derived(walk !== null && walk.tag === view.chosen ? walk.at : NO_MATCH);

  function moveBy(by: number): void {
    const at = clampedIndex(cursor, by, rows.length);
    if (at === NO_MATCH) return;

    walk = { tag: view.chosen, at };
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

<TagsShell {view} current="tags">
  {#snippet children(showList)}
    {#if view.status === 'failed'}
      <Alert variant="danger" role="alert">Your tags could not be read.</Alert>
    {/if}

    {#if shelf.status === 'failed'}
      <Alert variant="danger" role="alert" title="Your library could not be read">
        {shelf.loadFailure ?? 'The captures under your tags cannot be shown.'}
        {#snippet actions()}
          <Button size="sm" onclick={() => void shelf.load()}>Try again</Button>
        {/snippet}
      </Alert>
    {/if}

    {#if stage.kind === 'loading'}
      <p class="text-sm text-muted" aria-live="polite">Reading your tags…</p>
    {:else if stage.kind === 'no-tags'}
      <p class="text-sm text-muted">
        No tags yet. Tag a capture from the capture panel in the reader and it appears here.
      </p>
    {:else if stage.kind === 'unchosen'}
      <div class="col items-start gap-3">
        <p class="text-sm text-muted">
          No tag chosen. Pick one from the list to see everything carrying it.
        </p>
        <Button class="layout-app-shell-narrow-only" aria-haspopup="dialog" onclick={showList}>
          Choose a tag
        </Button>
      </div>
    {:else if stage.kind === 'unshelved'}
      <h1 class="row items-center gap-2 text-lg min-w-0">
        <Badge colour={stage.tag.colour} quiet dot aria-hidden="true" />
        <span class="truncate">{stage.tag.name}</span>
      </h1>
    {:else}
      {@const added = addedText(stage.summary, Date.now())}
      <header class="col gap-1">
        <h1 class="row items-center gap-2 text-lg min-w-0">
          <Badge colour={stage.tag.colour} quiet dot aria-hidden="true" />
          <span class="truncate">{stage.tag.name}</span>
        </h1>
        <p class="text-sm text-muted">
          {summaryText(stage.summary)}{#if added !== null}
            <span class="mx-1" aria-hidden="true">·</span>{added}{/if}
        </p>
      </header>

      {#if stage.kind === 'empty'}
        <p class="text-sm text-muted">
          Nothing carries {stage.tag.name} any more. Tag a capture in the reader to fill this in.
        </p>
      {:else}
        {#if neighbours.length > 0}
          <section class="col gap-2" aria-label="Also tagged">
            <p class="text-xs uppercase tracking-wide text-muted">Also tagged</p>
            <ul class="row wrap items-center gap-2 list-reset">
              {#each neighbours as other (other.id)}
                <li class="row min-w-0">
                  <Tag href={tagsHref(other.name)} colour={other.colour} class="min-w-0">
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
                <span
                  class="w-8 shrink-0 aspect-portrait overflow-hidden surface-sunken rounded-control"
                >
                  {#if shelf.cover !== null}
                    <img class="object-cover" src={shelf.cover} alt="" />
                  {/if}
                </span>
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
              <ul class="col gap-0 list-reset p-1 surface bordered rounded-container">
                {#each shelf.rows as row (row.id)}
                  {@const line = chipLine(row.chips)}
                  <li>
                    <CommandItem
                      bind:ref={anchors[row.order]}
                      href={row.href}
                      selected={row.order === cursor}
                      class="items-start"
                      onfocus={() => (walk = { tag: view.chosen, at: row.order })}
                    >
                      <span class="col gap-1 flex-1">
                        <span class="text-base" lang={shelf.language}>{row.text}</span>
                        <span class="row wrap items-center gap-2 text-xs text-muted">
                          <span class="mono">{row.place}</span>
                          {#if row.when !== null}
                            <span>{row.when}</span>
                          {/if}
                          {#each line.shown as chip (chip.id)}
                            <Badge colour={chip.colour} quiet dot>{chip.name}</Badge>
                          {/each}
                          {#if line.more > 0}
                            {@const more = row.chips
                              .slice(line.shown.length)
                              .map((chip) => chip.name)
                              .join(', ')}
                            <span title={more}
                              >+{line.more}<span class="visually-hidden"> more: {more}</span></span
                            >
                          {/if}
                        </span>
                      </span>
                      <span class="visually-hidden">Jump to p.{row.page}</span>
                    </CommandItem>
                  </li>
                {/each}
              </ul>
            </li>
          {/each}
        </ul>

        <KeyHints hints={TAG_SCREEN_KEYS} element="footer" class="gap-4" />
      {/if}
    {/if}
  {/snippet}
</TagsShell>
