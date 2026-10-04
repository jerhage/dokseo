<script lang="ts">
  import ExportImportPage from '$lib/domains/docs/ui/topics/ExportImportPage.svelte';
  import CapturesFileBuilder from '$lib/domains/storage/ui/docs-demos/CapturesFileBuilder.svelte';
  import CapturesFileReader from '$lib/domains/storage/ui/docs-demos/CapturesFileReader.svelte';
  import TwoDevices from '$lib/domains/storage/ui/docs-demos/TwoDevices.svelte';
</script>

<ExportImportPage>
  {#snippet builder()}<CapturesFileBuilder />{/snippet}
  {#snippet reader()}<CapturesFileReader />{/snippet}
  {#snippet devices()}<TwoDevices />{/snippet}
</ExportImportPage>
