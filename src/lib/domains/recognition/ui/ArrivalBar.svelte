<script lang="ts">
  import { goto } from '$app/navigation';
  import type { BookId } from '$lib/shared/ids';
  import type { Language } from '$lib/shared/language';
  import { readerHref } from '$lib/shared/reader-location';
  import type { ArrivalCapture, Stepping } from '../domain/capture-arrival';
  import { matchOfTotal } from '../domain/match-stepping';
  import { firstImage } from './capture-place';

  type Props = {
    readonly book: BookId;
    readonly query: string;
    readonly language: Language | null;
    readonly stepping: Stepping<ArrivalCapture>;
  };

  let { book, query, language, stepping }: Props = $props();

  function hrefOf(capture: ArrivalCapture): string | null {
    const index = firstImage(capture.regions);
    return index === null ? null : readerHref(book, index, { capture: capture.id, query });
  }

  const previous = $derived(hrefOf(stepping.previous));
  const next = $derived(hrefOf(stepping.next));
  const count = $derived(matchOfTotal(stepping.ordinal - 1, stepping.total));

  function follow(event: MouseEvent, href: string): void {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    void goto(href, { replaceState: true, keepFocus: true, noScroll: true });
  }
</script>

<div class="bar">
  <span class="count">{count}</span>
  <span class="rule"></span>
  <span class="query" class:ko={language === 'ko'} lang={language}>{query}</span>
  {#if previous !== null}
    <a class="step" href={previous} onclick={(event) => follow(event, previous)}>‹ Previous</a>
  {/if}
  {#if next !== null}
    <a class="step" href={next} onclick={(event) => follow(event, next)}>Next ›</a>
  {/if}
</div>

<style>
  .bar {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    padding: var(--s-2) var(--s-3);
    border: 1px solid var(--c-border-4);
    border-radius: var(--r-4);
    background: rgb(20 22 26 / 90%);
    font-family: var(--f-ui);
  }

  .count {
    color: var(--c-text-8);
    font-family: var(--f-mono);
    font-size: 10.5px;
  }

  .rule {
    width: 1px;
    height: 12px;
    background: var(--c-border-7);
  }

  .query {
    max-width: 220px;
    overflow: hidden;
    color: var(--c-text-3);
    font-family: var(--f-ja);
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .query.ko {
    font-family: var(--f-ko);
  }

  .step {
    color: var(--c-accent);
    font-size: 11.5px;
    text-decoration: none;
    white-space: nowrap;
  }

  .step:hover,
  .step:focus-visible {
    text-decoration: underline;
  }
</style>
