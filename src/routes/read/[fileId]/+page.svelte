<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query';
  import { onDestroy } from 'svelte';
  import { afterNavigate, goto, replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import { getToaster } from '$lib/components/toast-context';
  import { useContainer } from '$lib/context';
  import ArrivalBar from '$lib/domains/recognition/ui/capture/ArrivalBar.svelte';
  import SearchDialog from '$lib/domains/recognition/ui/capture/SearchDialog.svelte';
  import CapturePanel from '$lib/domains/recognition/ui/capture/CapturePanel.svelte';
  import EnginePill from '$lib/domains/recognition/ui/engine/EnginePill.svelte';
  import ModelConsentDialog from '$lib/domains/recognition/ui/engine/ModelConsentDialog.svelte';
  import LibraryShelfData from '$lib/domains/library/ui/LibraryShelfData.svelte';
  import FlowViewer from '$lib/domains/flowing/ui/FlowViewer.svelte';
  import ReaderScreen from '$lib/domains/viewing/ui/ReaderScreen.svelte';
  import { toastNotify } from '$lib/shared/notice-toast';
  import { ReadSession } from './read-session.svelte';

  let search = $state<ReturnType<typeof SearchDialog> | null>();

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
  );
  const { reader, captures, find, flow } = session;
  const id = $derived(session.id);
  const language = $derived(session.language);
  const opening = $derived(reader.opening);

  afterNavigate(() => session.navigate());

  onDestroy(() => session.close());
</script>

{#if opening.kind === 'flow'}
  <FlowViewer
    view={flow}
    book={opening.book}
    panelCount={captures.list.count}
    anchors={captures.list.anchors}
    onLift={(passage) => captures.recording.lift(passage.cfi, passage.quote, passage.chapter)}
    onsearch={() => search?.searchThisBook()}
    saving={reader.saving}
    onlanguage={(chosen) => void reader.setLanguage(chosen)}
  >
    {#snippet arrival()}
      {#if session.passageStepping !== null && session.finding !== null && flow.arrivalHolds}
        <ArrivalBar
          book={id}
          query={session.finding}
          {language}
          stepping={session.passageStepping}
          onfollowed={() => session.arrive(id)}
        />
      {/if}
    {/snippet}
    {#snippet panel(visible)}
      <CapturePanel
        view={captures}
        panel={session.flowPanel}
        {language}
        source="text"
        {visible}
        onSeek={(passage) => void flow.jumpToPassage(passage.cfi, passage.quote)}
      />
    {/snippet}
  </FlowViewer>
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
      {#if session.stepping !== null && session.finding !== null && session.arrivalShows}
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
      />
    {/snippet}
  </ReaderScreen>
{/if}

{#if captures.consent.request !== null}
  <ModelConsentDialog
    request={captures.consent.request}
    onagree={() => void captures.agree()}
    ondecline={() => captures.consent.decline()}
  />
{/if}

<LibraryShelfData library={container.library} lazy>
  {#snippet children(shelf)}
    <SearchDialog
      bind:this={search}
      book={id}
      books={shelf.searched}
      {find}
      tags={captures.tagging.tags}
      covers={shelf.covers}
      counts={shelf.counts}
      onopen={shelf.reload}
      onfollowedInBook={() => session.arrive(id)}
    />
  {/snippet}
</LibraryShelfData>
