<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import IndexedDbConcepts from './indexeddb/IndexedDbConcepts.svelte';
  import IndexedDbInDokseo from './indexeddb/IndexedDbInDokseo.svelte';
  import { INDEXEDDB_SECTIONS } from './indexeddb/indexeddb-sections';
  import IndexedDbTransactions from './indexeddb/IndexedDbTransactions.svelte';
  import IndexedDbWithoutSql from './indexeddb/IndexedDbWithoutSql.svelte';
</script>

<DocsPage slug="indexeddb" sections={Object.values(INDEXEDDB_SECTIONS)}>
  {#snippet lead()}
    What changes when a database has stores, keys and indexes instead of tables and queries: key
    ranges and cursors, transactions that commit on their own, version upgrades across tabs, and
    joins written in code. The demos run on a scratch database in this browser.
  {/snippet}
  <IndexedDbConcepts />
  <IndexedDbTransactions />
  <IndexedDbWithoutSql />
  <IndexedDbInDokseo />
</DocsPage>
