<script lang="ts">
  import { page } from '$app/state';
  import { useContainer } from '$lib/context';
  import CapturePanel from '$lib/domains/recognition/ui/CapturePanel.svelte';
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
    const source = view.source;
    if (source === null || language === null) return;
    void captures.recognize(source, language, regions, arrangement);
  }

  $effect(() => {
    void view.open(id);
    return () => {
      view.dispose();
      captures.clear();
    };
  });
</script>

<ReaderScreen {view} onSelect={capture}>
  {#snippet panel()}
    <CapturePanel view={captures} {language} />
  {/snippet}
</ReaderScreen>
