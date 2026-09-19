<script lang="ts">
	import { useContainer } from '$lib/context';
	import { LibraryScreen, LibraryView } from '$lib/domains/library';

	const view = new LibraryView(useContainer());

	$effect(() => {
		void view.load();
		return () => view.dispose();
	});
</script>

<LibraryScreen {view} />
