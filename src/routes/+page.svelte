<script lang="ts">
  import { useContainer } from '$lib/context';
  import LibraryScreen from '$lib/domains/library/ui/LibraryScreen.svelte';
  import { LibraryView } from '$lib/domains/library/ui/library-view.svelte';

  const view = new LibraryView(useContainer());

  $effect(() => {
    void view.load();
    return () => view.dispose();
  });
</script>

<LibraryScreen {view} />
