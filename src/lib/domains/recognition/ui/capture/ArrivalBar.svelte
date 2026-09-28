<script lang="ts">
  import { goto } from '$app/navigation';
  import Stepper from '$lib/components/Stepper.svelte';
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

<Stepper
  {steps}
  missingStep="hidden"
  previousLabel="Previous match"
  nextLabel="Next match"
  onfollow={follow}
  class="gap-2 ps-3 pe-1 py-1 surface-raised bordered rounded-container shadow-md"
  role="group"
  aria-label="Search matches"
>
  <span class="flex-fill min-w-0 truncate text-sm" lang={language}>{query}</span>
</Stepper>
