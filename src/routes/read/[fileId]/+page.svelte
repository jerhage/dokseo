<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query';
  import { onDestroy } from 'svelte';
  import { afterNavigate, goto, onNavigate, replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import { getToaster } from '$lib/components/toast-context';
  import { useContainer } from '$lib/context';
  import ArrivalBar from '$lib/domains/recognition/ui/capture/ArrivalBar.svelte';
  import BookCapturesData from '$lib/domains/recognition/ui/capture/BookCapturesData.svelte';
  import CaptureFindData from '$lib/domains/recognition/ui/capture/CaptureFindData.svelte';
  import { tagCountingOf } from '$lib/domains/recognition/ui/capture/capture-find';
  import SearchDialog from '$lib/domains/recognition/ui/capture/SearchDialog.svelte';
  import UnreadableCaptures from '$lib/domains/recognition/ui/capture/UnreadableCaptures.svelte';
  import UnreadableTags from '$lib/domains/recognition/ui/tag/UnreadableTags.svelte';
  import CapturePanel from '$lib/domains/recognition/ui/capture/CapturePanel.svelte';
  import EnginePill from '$lib/domains/recognition/ui/engine/EnginePill.svelte';
  import EngineGateData from '$lib/domains/recognition/ui/engine/EngineGateData.svelte';
  import ModelConsentDialog from '$lib/domains/recognition/ui/engine/ModelConsentDialog.svelte';
  import BookData from '$lib/domains/library/ui/BookData.svelte';
  import { flowingBook, readingTitle } from '$lib/domains/library/ui/book-read';
  import LibraryShelfData from '$lib/domains/library/ui/LibraryShelfData.svelte';
  import FlowViewer from '$lib/domains/flowing/ui/FlowViewer.svelte';
  import ReadingSettingsData from '$lib/domains/flowing/ui/ReadingSettingsData.svelte';
  import { comparePassages } from '$lib/domains/flowing/ui/flow-passage-order';
  import ReaderScreen from '$lib/domains/viewing/ui/ReaderScreen.svelte';
  import { edgeClicksTurn } from '$lib/shared/edge-clicks.svelte';
  import { toastNotify } from '$lib/shared/notice-toast';
  import PageTitle from '$lib/shared/PageTitle.svelte';
  import { ReadSession } from './read-session.svelte';

  let search = $state<ReturnType<typeof SearchDialog> | null>();
  let found = $state<ReturnType<typeof CaptureFindData> | null>(null);
  let listed = $state<ReturnType<typeof BookCapturesData> | null>(null);
  let engine = $state<ReturnType<typeof EngineGateData> | null>(null);

  const container = useContainer();
  const session = new ReadSession(
    container,
    useQueryClient(),
    toastNotify(getToaster()),
    {
      fileId: () => page.params.fileId,
      requested: () => page.url,
      shown: () => new URL(location.href),
      replace: (url) => replaceState(url, page.state),
      leave: (path) => void goto(path, { replaceState: true }),
    },
    (text) => navigator.clipboard.writeText(text),
    tagCountingOf(() => found?.read()),
    () => listed?.read(),
    () => engine?.read(),
  );
  const { reader, captures, flow } = session;
  const id = $derived(session.id);
  const language = $derived(session.language);

  afterNavigate(() => session.navigate());

  onNavigate((navigation) => session.leaving(navigation.to?.params?.fileId));

  onDestroy(() => session.close());
</script>

{#snippet unreadableCaptures()}
  <UnreadableCaptures
    captures={listed?.read().unreadable ?? []}
    recognition={container.recognition}
  />
{/snippet}

{#snippet unreadableTags()}
  <UnreadableTags tags={listed?.unreadableTagList() ?? []} recognition={container.recognition} />
{/snippet}

{#snippet flowPanel(visible: boolean)}
  <CapturePanel
    view={captures}
    panel={session.flowPanel}
    {language}
    source="text"
    {visible}
    onSeek={(passage) => void flow.arrivals.jumpToPassage(passage.cfi, passage.quote)}
    notice={unreadableCaptures}
    tagNotice={unreadableTags}
  />
{/snippet}

<BookData library={container.library} {id}>
  {#snippet children(read)}
    {@const flowing = flowingBook(read)}
    <PageTitle screen={readingTitle(read)} />
    {#if flowing !== null}
      <ReadingSettingsData
        flowing={container.flowing}
        panel={flowPanel}
        panelCount={captures.list.count}
      >
        {#snippet children(storedSettings)}
          <FlowViewer
            view={flow}
            book={flowing}
            {storedSettings}
            edgeClicksTurn={edgeClicksTurn()}
            panel={flowPanel}
            panelCount={captures.list.count}
            anchors={captures.list.anchors}
            onLift={(passage) =>
              captures.recording.lift(passage.cfi, passage.quote, passage.chapter)}
            onsearch={() => search?.searchThisBook()}
            saving={reader.preferences.saving}
            onlanguage={(chosen) => void reader.preferences.setLanguage(chosen)}
          >
            {#snippet arrival()}
              {#if id !== null && session.passageStepping !== null && session.finding !== null && flow.arrivals.arrivalHolds}
                <ArrivalBar
                  book={id}
                  query={session.finding}
                  {language}
                  stepping={session.passageStepping}
                  onfollowed={() => session.arrive(id)}
                />
              {/if}
            {/snippet}
          </FlowViewer>
        {/snippet}
      </ReadingSettingsData>
    {:else}
      <ReaderScreen
        view={reader}
        glow={session.glow}
        everyGlow={session.everyGlow}
        panelCount={captures.list.count}
        onSelect={(regions, laidOut) => captures.capture(reader.source, language, regions, laidOut)}
        onNote={(regions) => captures.recording.note(regions)}
        onsearch={() => search?.searchThisBook()}
      >
        {#snippet arrival()}
          {#if id !== null && session.stepping !== null && session.finding !== null && session.arrivalShows}
            <ArrivalBar book={id} query={session.finding} {language} stepping={session.stepping} />
          {/if}
        {/snippet}
        {#snippet engine()}
          <EnginePill engine={captures.warmup.engine} {language} />
        {/snippet}
        {#snippet panel(visible)}
          <CapturePanel
            view={captures}
            panel={session.imagePanel}
            {language}
            source="images"
            {visible}
            notice={unreadableCaptures}
            tagNotice={unreadableTags}
          />
        {/snippet}
      </ReaderScreen>
    {/if}
  {/snippet}
</BookData>

{#if captures.consent.request !== null}
  <ModelConsentDialog
    request={captures.consent.request}
    onagree={() => void captures.agree()}
    ondecline={() => captures.consent.decline()}
  />
{/if}

<BookCapturesData
  bind:this={listed}
  recognition={container.recognition}
  book={captures.list.book}
  onread={(book) => session.capturesRead(book)}
/>

<EngineGateData
  bind:this={engine}
  recognition={container.recognition}
  {language}
  onread={(read) => void captures.engineRead(read)}
/>

<LibraryShelfData library={container.library} lazy>
  {#snippet children(shelf)}
    <CaptureFindData bind:this={found} recognition={container.recognition}>
      {#snippet children(find)}
        <SearchDialog
          bind:this={search}
          book={id}
          books={shelf.searched}
          {find}
          passages={comparePassages}
          tags={captures.tagging.tags}
          covers={shelf.covers}
          counts={shelf.counts}
          onopen={shelf.reload}
          onfollowedInBook={() => id !== null && session.arrive(id)}
        >
          {#snippet notice()}
            <UnreadableCaptures captures={find.unreadable} recognition={container.recognition} />
          {/snippet}
        </SearchDialog>
      {/snippet}
    </CaptureFindData>
  {/snippet}
</LibraryShelfData>
