<script lang="ts">
  import { untrack } from 'svelte';
  import { goto, replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import { getToaster } from '$lib/components/toast-context';
  import { useContainer } from '$lib/context';
  import { LibraryView } from '$lib/domains/library/ui/library-view.svelte';
  import ArrivalBar from '$lib/domains/recognition/ui/capture/ArrivalBar.svelte';
  import SearchDialog from '$lib/domains/recognition/ui/capture/SearchDialog.svelte';
  import CapturePanel from '$lib/domains/recognition/ui/capture/CapturePanel.svelte';
  import EnginePill from '$lib/domains/recognition/ui/engine/EnginePill.svelte';
  import ModelConsentDialog from '$lib/domains/recognition/ui/engine/ModelConsentDialog.svelte';
  import { CaptureSearchView } from '$lib/domains/recognition/ui/capture/capture-search.svelte';
  import { CaptureView } from '$lib/domains/recognition/ui/capture/capture-view.svelte';
  import { arrivalGlow } from '$lib/domains/recognition/ui/capture/capture-glow';
  import FlowViewer from '$lib/domains/flowing/ui/FlowViewer.svelte';
  import { FlowView } from '$lib/domains/flowing/ui/flow-view.svelte';
  import ReaderScreen from '$lib/domains/viewing/ui/ReaderScreen.svelte';
  import { ReaderView } from '$lib/domains/viewing/ui/reader-view.svelte';
  import type { SoughtPassage } from '$lib/shared/anchor';
  import { bookId } from '$lib/shared/ids';
  import type { BookId, ImageIndex } from '$lib/shared/ids';
  import { toastNotify } from '$lib/shared/notice-toast';
  import { effectiveDirection } from '$lib/shared/layout-kind';
  import {
    IMAGE_PARAMETER,
    LIBRARY_AFTER_MISSING_BOOK,
    arrivalQuery,
    readArrival,
    readImageIndex,
    urlWithImageIndex,
  } from '$lib/shared/reader-location';

  let search = $state<ReturnType<typeof SearchDialog> | null>();

  function mirror(index: ImageIndex): void {
    const moved = urlWithImageIndex(page.url, index);
    if (moved !== null) replaceState(moved, page.state);
  }

  function arrive(book: BookId): void {
    const wanted = passage;
    if (wanted !== null) flow.arriveAt(book, wanted);
  }

  const container = useContainer();
  const notify = toastNotify(getToaster());
  const view = new ReaderView(container, notify, mirror);
  const captures = new CaptureView(container, notify);
  const shelf = new LibraryView(container, notify);
  const find = new CaptureSearchView(container);
  const flow = new FlowView(container, notify);
  const id = $derived(bookId(page.params.fileId ?? ''));
  const language = $derived(view.book?.language ?? null);
  const flowBook = $derived(view.flowBook);
  const asked = $derived(readImageIndex(page.url.searchParams.get(IMAGE_PARAMETER)));
  const found = $derived(readArrival(page.url.searchParams));
  const here = $derived(captures.arrivalFrom(found, view.direction));
  const glow = $derived(arrivalGlow(here));
  const passage = $derived<SoughtPassage | null>(captures.passageFrom(found));
  const stepping = $derived(here?.stepping ?? null);
  const finding = $derived(arrivalQuery(found));
  const books = $derived(
    shelf.books.map((held) => ({
      id: held.id,
      title: held.title,
      language: held.language,
      direction: effectiveDirection(held.direction, held.layoutKind),
    })),
  );

  $effect(() => {
    const book = id;
    const entry = untrack(() => asked);
    untrack(() => {
      void view.open(book, entry);
      void captures.open(book).then(() => arrive(book));
    });
    return () => {
      view.dispose();
      captures.close();
      shelf.dispose();
      find.dispose();
    };
  });

  $effect(() => {
    const at = asked;
    const book = id;
    if (at === null) return;
    untrack(() => void view.goToImage(book, at));
  });

  $effect(() => {
    if (language !== null) void captures.warm(id, language);
  });

  $effect(() => {
    if (view.status === 'missing') void goto(LIBRARY_AFTER_MISSING_BOOK, { replaceState: true });
  });
</script>

{#if flowBook !== null}
  <FlowViewer
    view={flow}
    book={flowBook}
    panelCount={captures.count}
    anchors={captures.anchors}
    onLift={(passage) => captures.lift(passage.cfi, passage.quote)}
    onsearch={() => search?.searchThisBook()}
  >
    {#snippet panel()}
      <CapturePanel
        view={captures}
        {language}
        direction={flow.direction}
        onSeek={(passage) => void flow.jumpToPassage(passage.cfi, passage.quote)}
      />
    {/snippet}
  </FlowViewer>
{:else}
  <ReaderScreen
    {view}
    {glow}
    panelCount={captures.count}
    onSelect={(regions, laidOut) => captures.capture(view.source, language, regions, laidOut)}
    onNote={(regions) => captures.note(regions)}
    onsearch={() => search?.searchThisBook()}
  >
    {#snippet arrival()}
      {#if stepping !== null && finding !== null}
        <ArrivalBar book={id} query={finding} {language} {stepping} />
      {/if}
    {/snippet}
    {#snippet engine()}
      <EnginePill engine={captures.engine} {language} />
    {/snippet}
    {#snippet panel()}
      <CapturePanel view={captures} {language} direction={view.direction} />
    {/snippet}
  </ReaderScreen>
{/if}

{#if captures.consentRequest !== null}
  <ModelConsentDialog
    request={captures.consentRequest}
    onagree={() => void captures.agree()}
    ondecline={() => captures.decline()}
  />
{/if}

<SearchDialog
  bind:this={search}
  book={id}
  {books}
  {find}
  tags={captures.tags}
  covers={shelf.covers}
  counts={shelf.imageCounts}
  onopen={() => void shelf.load()}
  onfollowedInBook={() => arrive(id)}
/>
