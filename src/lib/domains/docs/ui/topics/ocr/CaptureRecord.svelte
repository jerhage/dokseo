<script lang="ts">
  import { takenCapture } from '$lib/domains/recognition/domain/capture/capture';
  import { regionAnchor } from '$lib/shared/anchor';
  import { bookId, captureId } from '$lib/shared/ids';
  import type { ImageRegion } from '$lib/shared/image-region';
  import DocsCode from '../../DocsCode.svelte';
  import DocsDemo from '../../DocsDemo.svelte';

  type Props = {
    regions: readonly ImageRegion[];
    text: string;
    confidence: number | null;
  };

  let { regions, text, confidence }: Props = $props();

  const id = captureId(crypto.randomUUID());
  const createdAt = Date.now();

  const record = $derived(
    takenCapture(
      {
        id,
        bookId: bookId('sample-book'),
        anchor: regionAnchor(regions),
        text,
        confidence,
        origin: 'recognized',
      },
      createdAt,
    ),
  );
</script>

<DocsDemo label="A capture record">
  <DocsCode label="The record saved for this selection" code={JSON.stringify(record, null, 2)} />
  {#snippet caption()}
    Built by the same function the save use case calls, from the selection above and the last text
    the real model read on this page. Nothing is saved.
  {/snippet}
</DocsDemo>
