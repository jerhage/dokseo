<script lang="ts">
  import type { Snippet } from 'svelte';
  import DocsPage from '../DocsPage.svelte';
  import ExportImportConcepts from './export-import/ExportImportConcepts.svelte';
  import ExportImportFormat from './export-import/ExportImportFormat.svelte';
  import ExportImportMerge from './export-import/ExportImportMerge.svelte';
  import ExportImportSaving from './export-import/ExportImportSaving.svelte';
  import { EXPORT_IMPORT_SECTIONS } from './export-import/export-import-sections';

  type Props = { builder: Snippet; reader: Snippet; devices: Snippet };

  let { builder, reader, devices }: Props = $props();
</script>

<DocsPage slug="export-import" sections={Object.values(EXPORT_IMPORT_SECTIONS)}>
  {#snippet lead()}
    How an app with no server moves a person's work between devices in a file, and how Dokseo's
    captures file is written, read, merged and saved.
  {/snippet}

  <ExportImportConcepts />
  <ExportImportFormat {builder} {reader} />
  <ExportImportMerge {devices} />
  <ExportImportSaving />
</DocsPage>
