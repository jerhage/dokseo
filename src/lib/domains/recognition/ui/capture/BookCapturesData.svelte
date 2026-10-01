<script lang="ts">
  import type { BookId } from '$lib/shared/ids';
  import { readQuery } from '$lib/shared/read-query.svelte';
  import { capturesQuery } from '../../queries/capture-queries';
  import type { BookCaptureReads } from '../../queries/capture-queries';
  import { storedCaptures, storedTags } from '../../queries/store-read';
  import { tagsQuery } from '../../queries/tag-queries';
  import type { TagReads } from '../../queries/tag-queries';
  import { foundCaptures, foundTags } from './capture-find';
  import { captureReadOf } from './capture-read';
  import type { CaptureListing } from './capture-read';

  type Props = {
    readonly recognition: BookCaptureReads & TagReads;
    readonly book: BookId | null;
  };

  let { recognition, book }: Props = $props();

  const listed = readQuery(() => capturesQuery(recognition, book));
  const tagList = readQuery(() => tagsQuery(recognition));
  const captures = $derived(storedCaptures(listed.state));
  const tags = $derived(storedTags(tagList.state));
  const held = $derived(captureReadOf(captures, tags));
  const rows = $derived(foundCaptures(captures));
  const named = $derived(foundTags(tags));

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
    reload,
  };

  export function read(): CaptureListing {
    return listing;
  }
</script>
