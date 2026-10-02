<script lang="ts">
  import { untrack } from 'svelte';
  import type { BookId } from '$lib/shared/ids';
  import { readQuery } from '$lib/shared/read-query.svelte';
  import { capturesQuery } from '../../queries/capture-queries';
  import type { BookCaptureReads } from '../../queries/capture-queries';
  import { storedCaptures, storedTags, unreadableCaptures } from '../../queries/store-read';
  import { tagsQuery } from '../../queries/tag-queries';
  import type { TagReads } from '../../queries/tag-queries';
  import { foundCaptures, foundTags } from './capture-find';
  import { captureReadOf } from './capture-read';
  import type { CaptureListing } from './capture-read';

  type Props = {
    readonly recognition: BookCaptureReads & TagReads;
    readonly book: BookId | null;
    readonly onread?: (book: BookId) => void;
  };

  let { recognition, book, onread }: Props = $props();

  const listed = readQuery(() => capturesQuery(recognition, book));
  const tagList = readQuery(() => tagsQuery(recognition));
  const captures = $derived(storedCaptures(listed.state));
  const tags = $derived(storedTags(tagList.state));
  const held = $derived(captureReadOf(captures, tags));
  const rows = $derived(foundCaptures(captures));
  const named = $derived(foundTags(tags));
  const unreadable = $derived(unreadableCaptures(listed.state));
  const settled = $derived(book !== null && listed.state.kind !== 'loading' ? book : null);

  $effect(() => {
    const ready = settled;
    if (ready !== null) untrack(() => onread?.(ready));
  });

  function reload(): void {
    if (book !== null) listed.reload();
    tagList.reload();
  }

  const listing: CaptureListing = {
    get state() {
      return held;
    },
    get captures() {
      return rows;
    },
    get tags() {
      return named;
    },
    get unreadable() {
      return unreadable;
    },
    reload,
  };

  export function read(): CaptureListing {
    return listing;
  }
</script>
