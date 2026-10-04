<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import { STORED_FORMAT_SECTIONS } from './stored-format/stored-format-sections';
  import StoredFormatConcepts from './stored-format/StoredFormatConcepts.svelte';
</script>

<DocsPage slug="stored-format" sections={Object.values(STORED_FORMAT_SECTIONS)}>
  {#snippet lead()}
    What a promise about stored data means for an app with no server, why Dokseo reads every row
    strictly and changes its format only through database versions, then every record the 1.x
    promise covers, field by field, the captures file and its golden copy, and what happens to a row
    that does not match.
  {/snippet}
  <StoredFormatConcepts />
</DocsPage>
