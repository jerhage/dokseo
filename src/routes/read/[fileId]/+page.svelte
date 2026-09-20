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
  import { bookId, type ImageIndex } from '$lib/shared/ids';
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
  const asked = $derived(readImageIndex(page.url.searchParams.get(IMAGE_PARAMETER)));

  $effect(() => {
    const entry = untrack(() => asked);
    void view.open(id, entry);
    void captures.open(id);
    return () => {
      view.dispose();
      captures.close();
    };
  });

  $effect(() => {
    if (asked !== null) void view.goToImage(id, asked);
  });

  $effect(() => {
    if (language !== null) void captures.warm(id, language);
  });

  $effect(() => {
    if (view.status === 'missing') void goto(LIBRARY_AFTER_MISSING_BOOK, { replaceState: true });
  });
</script>

<ReaderScreen
  {view}
  onSelect={(regions, laidOut) => captures.capture(view.source, language, regions, laidOut)}
>
  {#snippet engine()}
    <EnginePill engine={captures.engine} {language} />
  {/snippet}
  {#snippet panel()}
    <CapturePanel view={captures} {language} direction={view.direction} />
  {/snippet}
</ReaderScreen>
