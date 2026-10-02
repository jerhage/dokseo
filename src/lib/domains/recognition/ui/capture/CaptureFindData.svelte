<script lang="ts">
  import type { Snippet } from 'svelte';
  import { readQuery } from '$lib/shared/read-query.svelte';
  import { tagCounts } from '../../domain/tag/capture-tags';
  import { everyCaptureQuery } from '../../queries/capture-queries';
  import type { CaptureReads } from '../../queries/capture-queries';
  import { storedCaptures, storedTags, unreadableCaptures } from '../../queries/store-read';
  import { tagsQuery } from '../../queries/tag-queries';
  import type { TagReads } from '../../queries/tag-queries';
  import { foundCaptures, foundTags } from './capture-find';
  import type { CaptureFindRead } from './capture-find';

  type Props = {
    readonly recognition: CaptureReads & TagReads;
    readonly children: Snippet<[CaptureFindRead]>;
  };

  let { recognition, children }: Props = $props();

  let asked = $state(false);

  const everyCapture = readQuery(() => ({ ...everyCaptureQuery(recognition), enabled: asked }));
  const tagList = readQuery(() => ({ ...tagsQuery(recognition), enabled: asked }));
  const found = $derived(storedCaptures(everyCapture.state));
  const captures = $derived(foundCaptures(found));
  const tags = $derived(foundTags(storedTags(tagList.state)));
  const counted = $derived(tagCounts(captures));
  const unreadable = $derived(unreadableCaptures(everyCapture.state));

  function reload(): void {
    if (!asked) {
      asked = true;
      return;
    }
    everyCapture.reload();
    tagList.reload();
  }

  const find: CaptureFindRead = {
    get state() {
      return found;
    },
    get captures() {
      return captures;
    },
    get tags() {
      return tags;
    },
    get tagCounts() {
      return counted;
    },
    get unreadable() {
      return unreadable;
    },
    reload,
  };

  export function read(): CaptureFindRead {
    return find;
  }
</script>

{@render children(find)}
