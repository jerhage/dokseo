<script lang="ts">
  import { goto } from '$app/navigation';
  import Badge from '$lib/components/Badge.svelte';
  import IconButton from '$lib/components/IconButton.svelte';
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
      <IconButton
        variant="ghost"
        size="sm"
        href={previous}
        icon={ChevronLeft}
        label="Previous match"
        onclick={(event) => follow(event, previous)}
      />
    {/if}
    {#if steps.next !== null}
      {@const next = steps.next}
      <IconButton
        variant="ghost"
        size="sm"
        href={next}
        icon={ChevronRight}
        label="Next match"
        onclick={(event) => follow(event, next)}
      />
    {/if}
  </span>
</div>
