<script lang="ts">
  import { page } from '$app/state';
  import { useContainer } from '$lib/context';
  import ReaderScreen from '$lib/domains/viewing/ui/ReaderScreen.svelte';
  import { ReaderView } from '$lib/domains/viewing/ui/reader-view.svelte';
  import { bookId } from '$lib/shared/ids';

  const view = new ReaderView(useContainer());
  const id = $derived(bookId(page.params.fileId ?? ''));

  $effect(() => {
    void view.open(id);
    return () => view.dispose();
  });
</script>

<ReaderScreen {view} />
