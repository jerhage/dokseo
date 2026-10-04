<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import ExportImportConcepts from './export-import/ExportImportConcepts.svelte';
  import ExportImportFormat from './export-import/ExportImportFormat.svelte';
  import ExportImportMerge from './export-import/ExportImportMerge.svelte';
  import ExportImportSaving from './export-import/ExportImportSaving.svelte';
  import { EXPORT_IMPORT_SECTIONS } from './export-import/export-import-sections';
</script>

<DocsPage slug="export-import" sections={Object.values(EXPORT_IMPORT_SECTIONS)}>
  {#snippet lead()}
    How an app with no server moves a person's work between devices in a file, and how Dokseo's
    captures file is written, read, merged and saved.
  {/snippet}

  <ExportImportConcepts />
  <ExportImportFormat />
  <ExportImportMerge />
  <ExportImportSaving />
</DocsPage>
