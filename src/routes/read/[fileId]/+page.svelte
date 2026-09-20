<script lang="ts">
  import { untrack } from 'svelte';
  import { goto, replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import { useContainer } from '$lib/context';
  import CapturePanel from '$lib/domains/recognition/ui/CapturePanel.svelte';
  import EnginePill from '$lib/domains/recognition/ui/EnginePill.svelte';
  import { CaptureView } from '$lib/domains/recognition/ui/capture-view.svelte';
  import ReaderScreen from '$lib/domains/viewing/ui/ReaderScreen.svelte';
  import { ReaderView } from '$lib/domains/viewing/ui/reader-view.svelte';
  import type { Arrangement } from '$lib/shared/arrangement';
  import { bookId, type ImageIndex } from '$lib/shared/ids';
  import type { ImageRegion } from '$lib/shared/image-region';
  import { effectiveDirection, type ReadingDirection } from '$lib/shared/layout-kind';
  import {
    IMAGE_PARAMETER,
    LIBRARY_AFTER_MISSING_BOOK,
    readImageIndex,
    urlWithImageIndex,
  } from '$lib/shared/reader-location';

  function mirror(index: ImageIndex): void {
    const moved = urlWithImageIndex(page.url, index);
    if (moved !== null) replaceState(moved, page.state);
  }

  const container = useContainer();
  const view = new ReaderView(container, mirror);
  const captures = new CaptureView(container);
  const id = $derived(bookId(page.params.fileId ?? ''));
  const language = $derived(view.book?.language ?? null);
  const direction = $derived<ReadingDirection>(
    view.book === null ? 'ltr' : effectiveDirection(view.book.direction, view.book.layoutKind),
  );

  function capture(regions: readonly ImageRegion[], arrangement: Arrangement): void {
    const trace = container.beginTrace('capture');
    try {
      const source = view.source;
      if (source === null || language === null) {
        trace.step('stopped', {
          guard: 'no-open-book',
          hasSource: source !== null,
          language,
        });
        return;
      }

      trace.step('dispatched', { language, arrangement, regions: regions.length });
      void captures.recognize(source, language, regions, arrangement);
    } finally {
      trace.end();
    }
  }

  $effect(() => {
    const asked = untrack(() => readImageIndex(page.url.searchParams.get(IMAGE_PARAMETER)));
    void view.open(id, asked);
    void captures.open(id);
    return () => {
      view.dispose();
      captures.close();
    };
  });

  $effect(() => {
    const chosen = language;
    if (chosen !== null) void captures.warm(id, chosen);
  });

  $effect(() => {
    if (view.status === 'missing') void goto(LIBRARY_AFTER_MISSING_BOOK, { replaceState: true });
  });
</script>

<ReaderScreen {view} onSelect={capture}>
  {#snippet engine()}
    <EnginePill engine={captures.engine} {language} />
  {/snippet}
  {#snippet panel()}
    <CapturePanel view={captures} {language} {direction} />
  {/snippet}
</ReaderScreen>
