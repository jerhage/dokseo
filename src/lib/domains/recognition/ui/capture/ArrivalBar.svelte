<script lang="ts">
  import { goto } from '$app/navigation';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import ChevronLeft from '$lib/components/icons/ChevronLeft.svelte';
  import ChevronRight from '$lib/components/icons/ChevronRight.svelte';
  import type { BookId } from '$lib/shared/ids';
  import type { Language } from '$lib/shared/language';
  import type { ArrivalCapture, Stepping } from '../../domain/capture/capture-arrival';
  import { arrivalSteps } from './arrival-steps';

  type Props = {
    readonly book: BookId;
    readonly query: string;
    readonly language: Language | null;
    readonly stepping: Stepping<ArrivalCapture>;
  };

  let { book, query, language, stepping }: Props = $props();

  const steps = $derived(arrivalSteps(book, query, stepping));

  function follow(event: MouseEvent, href: string): void {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    void goto(href, { replaceState: true, keepFocus: true, noScroll: true });
  }
</script>

<div
  class="row items-center gap-2 ps-3 pe-1 py-1 surface-raised bordered rounded-container shadow-md"
  role="group"
  aria-label="Search matches"
>
  <Badge variant="brand" class="shrink-0">{steps.count}</Badge>
  <span class="flex-fill min-w-0 truncate text-sm" lang={language}>{query}</span>
  <span class="row items-center gap-0 shrink-0">
    {#if steps.previous !== null}
      {@const previous = steps.previous}
      <Button
        variant="ghost"
        size="sm"
        square
        href={previous}
        title="Previous match"
        onclick={(event) => follow(event, previous)}
      >
        <ChevronLeft class="btn-icon" />
        <span class="visually-hidden">Previous match</span>
      </Button>
    {/if}
    {#if steps.next !== null}
      {@const next = steps.next}
      <Button
        variant="ghost"
        size="sm"
        square
        href={next}
        title="Next match"
        onclick={(event) => follow(event, next)}
      >
        <ChevronRight class="btn-icon" />
        <span class="visually-hidden">Next match</span>
      </Button>
    {/if}
  </span>
</div>
