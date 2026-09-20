<script lang="ts">
  import { page } from '$app/state';
  import { useContainer } from '$lib/context';
  import CapturePanel from '$lib/domains/recognition/ui/CapturePanel.svelte';
  import EnginePill from '$lib/domains/recognition/ui/EnginePill.svelte';
  import { CaptureView } from '$lib/domains/recognition/ui/capture-view.svelte';
  import ReaderScreen from '$lib/domains/viewing/ui/ReaderScreen.svelte';
  import { ReaderView } from '$lib/domains/viewing/ui/reader-view.svelte';
  import type { Arrangement } from '$lib/shared/arrangement';
  import { bookId } from '$lib/shared/ids';
  import type { ImageRegion } from '$lib/shared/image-region';

  const container = useContainer();
  const view = new ReaderView(container);
  const captures = new CaptureView(container);
  const id = $derived(bookId(page.params.fileId ?? ''));
  const language = $derived(view.book?.language ?? null);

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
    void view.open(id);
    void captures.open(id);
    return () => {
      view.dispose();
      captures.close();
    };
  });
</script>

<ReaderScreen {view} onSelect={capture}>
  {#snippet engine()}
    <EnginePill session={captures.session} {language} />
  {/snippet}
  {#snippet panel()}
    <CapturePanel view={captures} {language} />
  {/snippet}
</ReaderScreen>
