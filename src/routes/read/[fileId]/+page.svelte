<script lang="ts">
  import { untrack } from 'svelte';
  import { goto, replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import { useContainer } from '$lib/context';
  import { LibraryView } from '$lib/domains/library/ui/library-view.svelte';
  import ArrivalBar from '$lib/domains/recognition/ui/ArrivalBar.svelte';
  import CapturePalette from '$lib/domains/recognition/ui/CapturePalette.svelte';
  import CapturePanel from '$lib/domains/recognition/ui/CapturePanel.svelte';
  import EnginePill from '$lib/domains/recognition/ui/EnginePill.svelte';
  import { CaptureSearchView } from '$lib/domains/recognition/ui/capture-search.svelte';
  import { CaptureView } from '$lib/domains/recognition/ui/capture-view.svelte';
  import ReaderScreen from '$lib/domains/viewing/ui/ReaderScreen.svelte';
  import { ReaderView } from '$lib/domains/viewing/ui/reader-view.svelte';
  import { bookId, type ImageIndex } from '$lib/shared/ids';
  import { effectiveDirection } from '$lib/shared/layout-kind';
  import {
    IMAGE_PARAMETER,
    LIBRARY_AFTER_MISSING_BOOK,
    readArrival,
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
  const shelf = new LibraryView(container);
  const find = new CaptureSearchView(container);
  const id = $derived(bookId(page.params.fileId ?? ''));
  const language = $derived(view.book?.language ?? null);
  const asked = $derived(readImageIndex(page.url.searchParams.get(IMAGE_PARAMETER)));
  const found = $derived(readArrival(page.url.searchParams));
  const here = $derived(captures.arrivalFrom(found, view.direction));
  const books = $derived(
    shelf.books.map((held) => ({
      id: held.id,
      title: held.title,
      language: held.language,
      direction: effectiveDirection(held.direction, held.layoutKind),
    })),
  );

  $effect(() => {
    const entry = untrack(() => asked);
    void view.open(id, entry);
    void captures.open(id);
    return () => {
      view.dispose();
      captures.close();
      shelf.dispose();
      find.dispose();
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
  glow={here?.at.regions ?? []}
  onSelect={(regions, laidOut) => captures.capture(view.source, language, regions, laidOut)}
>
  {#snippet arrival()}
    {#if here !== null && found !== null}
      <ArrivalBar book={id} query={found.query} {language} arrival={here} />
    {/if}
  {/snippet}
  {#snippet engine()}
    <EnginePill engine={captures.engine} {language} />
  {/snippet}
  {#snippet panel()}
    <CapturePanel view={captures} {language} direction={view.direction} />
  {/snippet}
</ReaderScreen>

<CapturePalette book={id} {books} {find} covers={shelf.covers} onopen={() => void shelf.load()} />
