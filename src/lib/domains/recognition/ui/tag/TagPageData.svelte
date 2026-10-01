<script lang="ts">
  import type { Snippet } from 'svelte';
  import { readQuery } from '$lib/shared/read-query.svelte';
  import { readBoth } from '$lib/shared/read-state';
  import type { ReadState } from '$lib/shared/read-state';
  import { everyCaptureQuery } from '../../queries/capture-queries';
  import type { CaptureReads } from '../../queries/capture-queries';
  import { storedCaptures, storedTags } from '../../queries/store-read';
  import { tagsQuery } from '../../queries/tag-queries';
  import type { TagReads } from '../../queries/tag-queries';
  import { taggedCapturesOf } from './tag-view.svelte';
  import type { TaggedCaptures } from './tag-view.svelte';

  type Props = {
    readonly recognition: CaptureReads & TagReads;
    readonly children: Snippet;
  };

  let { recognition, children }: Props = $props();

  const tagList = readQuery(() => tagsQuery(recognition));
  const everyCapture = readQuery(() => everyCaptureQuery(recognition));
  const tagged = $derived(
    readBoth(storedTags(tagList.state), storedCaptures(everyCapture.state), taggedCapturesOf),
  );

  export function read(): ReadState<TaggedCaptures> {
    return tagged;
  }
</script>

{@render children()}
