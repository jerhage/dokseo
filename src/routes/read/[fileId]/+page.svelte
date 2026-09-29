<script lang="ts">
  import { onDestroy } from 'svelte';
  import { match } from 'ts-pattern';
  import { afterNavigate, goto, replaceState } from '$app/navigation';
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
  import { arrivalGlow, everyOtherGlow } from '$lib/domains/recognition/ui/capture/capture-glow';
  import FlowViewer from '$lib/domains/flowing/ui/FlowViewer.svelte';
  import { comparePassages } from '$lib/domains/flowing/ui/flow-passage-order';
  import { FlowView } from '$lib/domains/flowing/ui/flow-view.svelte';
  import ReaderScreen from '$lib/domains/viewing/ui/ReaderScreen.svelte';
  import { ReaderView } from '$lib/domains/viewing/ui/reader-view.svelte';
  import type { SoughtPassage } from '$lib/shared/anchor';
  import { bookId } from '$lib/shared/ids';
  import type { BookId, ImageIndex } from '$lib/shared/ids';
  import type { Language } from '$lib/shared/language';
  import { toastNotify } from '$lib/shared/notice-toast';
  import { effectiveDirection } from '$lib/shared/layout-kind';
  import {
    IMAGE_ARRIVAL_SHOWING,
    IMAGE_PARAMETER,
    LIBRARY_AFTER_MISSING_BOOK,
    arrivalQuery,
    imageArrivalShows,
    mirroredPlace,
    readArrival,
    readImageIndex,
    readerNavigation,
  } from '$lib/shared/reader-location';
  import type {
    ImageArrivalStanding,
    ReaderRequest,
    ShownPlace,
  } from '$lib/shared/reader-location';

  let search = $state<ReturnType<typeof SearchDialog> | null>();
  let arrivalStanding = $state<ImageArrivalStanding>(IMAGE_ARRIVAL_SHOWING);

  function mirror(place: ShownPlace): void {
    const mirrored = mirroredPlace(new URL(location.href), place, arrivalStanding);
    arrivalStanding = mirrored.standing;
    if (mirrored.url !== null) replaceState(mirrored.url, page.state);
  }

  function warm(book: BookId, known: Language): void {
    void captures.warm(book, known);
  }

  function arrive(book: BookId): void {
    const wanted = passage;
    if (wanted !== null) flow.arriveAt(book, wanted);
  }

  const container = useContainer();
  const notify = toastNotify(getToaster());
  const view = new ReaderView(container, notify, mirror, warm);
  const captures = new CaptureView(container, notify);
  const shelf = new LibraryView(container, notify);
  const find = new CaptureSearchView(container);
  const flow = new FlowView(container, notify);
  const id = $derived(bookId(page.params.fileId ?? ''));
  const language = $derived(view.language);
  const flowBook = $derived(view.flowBook);
  const asked = $derived(readImageIndex(page.url.searchParams.get(IMAGE_PARAMETER)));
  const found = $derived(readArrival(page.url.searchParams));
  const here = $derived(captures.arrivalFrom(found, view.direction));
  const glow = $derived(arrivalGlow(here));
  const everyGlow = $derived(everyOtherGlow(captures.read, here));
  const passage = $derived<SoughtPassage | null>(captures.passageFrom(found));
  const stepping = $derived(here?.stepping ?? null);
  const passageHere = $derived(captures.passageArrivalFrom(found, comparePassages));
  const passageStepping = $derived(passageHere?.stepping ?? null);
  const finding = $derived(arrivalQuery(found));
  const arrivalShows = $derived(imageArrivalShows(arrivalStanding));
  const books = $derived(
    shelf.books.map((held) => ({
      id: held.id,
      title: held.title,
      language: held.language,
      direction: effectiveDirection(held.direction, held.layoutKind),
    })),
  );

  let requested: ReaderRequest | null = null;

  function leaveIfMissing(): void {
    if (view.status === 'missing') void goto(LIBRARY_AFTER_MISSING_BOOK, { replaceState: true });
  }

  function openBook(book: BookId, image: ImageIndex | null): void {
    void view.open(book, image).then(leaveIfMissing);
    void captures.open(book).then(() => arrive(book));
  }

  function closeBook(): void {
    view.dispose();
    captures.close();
    shelf.dispose();
    find.dispose();
  }

  afterNavigate(() => {
    arrivalStanding = IMAGE_ARRIVAL_SHOWING;
    const wanted = { book: id, image: asked };
    const next = readerNavigation(requested, wanted);
    requested = wanted;
    match(next)
      .with({ kind: 'enter' }, ({ book, image }) => openBook(book, image))
      .with({ kind: 'switch' }, ({ book, image }) => {
        closeBook();
        openBook(book, image);
      })
      .with({ kind: 'go-to-image' }, ({ book, image }) => void view.goToImage(book, image))
      .with({ kind: 'stay' }, () => undefined)
      .exhaustive();
  });

  onDestroy(closeBook);
</script>

{#if flowBook !== null}
  <FlowViewer
    view={flow}
    book={flowBook}
    panelCount={captures.count}
    anchors={captures.anchors}
    onLift={(passage) => captures.lift(passage.cfi, passage.quote, passage.chapter)}
    onsearch={() => search?.searchThisBook()}
    saving={view.saving}
    onlanguage={(chosen) => void view.setLanguage(chosen)}
  >
    {#snippet arrival()}
      {#if passageStepping !== null && finding !== null && flow.arrivalHolds}
        <ArrivalBar
          book={id}
          query={finding}
          {language}
          stepping={passageStepping}
          onfollowed={() => arrive(id)}
        />
      {/if}
    {/snippet}
    {#snippet panel()}
      <CapturePanel
        view={captures}
        {language}
        direction={flow.direction}
        source="text"
        onSeek={(passage) => void flow.jumpToPassage(passage.cfi, passage.quote)}
      />
    {/snippet}
  </FlowViewer>
{:else}
  <ReaderScreen
    {view}
    {glow}
    {everyGlow}
    panelCount={captures.count}
    onSelect={(regions, laidOut) => captures.capture(view.source, language, regions, laidOut)}
    onNote={(regions) => captures.note(regions)}
    onsearch={() => search?.searchThisBook()}
  >
    {#snippet arrival()}
      {#if stepping !== null && finding !== null && arrivalShows}
        <ArrivalBar book={id} query={finding} {language} {stepping} />
      {/if}
    {/snippet}
    {#snippet engine()}
      <EnginePill engine={captures.engine} {language} />
    {/snippet}
    {#snippet panel()}
      <CapturePanel view={captures} {language} direction={view.direction} source="images" />
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
