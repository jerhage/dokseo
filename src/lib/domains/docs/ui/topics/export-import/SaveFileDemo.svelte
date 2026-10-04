<script lang="ts">
  import DocsDemo from '../../DocsDemo.svelte';
  import SaveFileRehearsal from './SaveFileRehearsal.svelte';
</script>

<DocsDemo label="Share sheet or download" resettable resetLabel="Start over">
  {#snippet caption()}
    The buttons are Dokseo's real per-book export button and view model, saving through the real
    <code>saveFile</code>. Only <code>canShare</code>, <code>share</code> and the download are stand-ins,
    so no sheet opens and no file is saved.
  {/snippet}
  <SaveFileRehearsal />
</DocsDemo>
