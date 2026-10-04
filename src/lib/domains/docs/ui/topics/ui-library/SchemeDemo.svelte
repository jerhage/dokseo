<script lang="ts">
  import DocsDemo from '../../DocsDemo.svelte';
  import ThemeSpecimen from './ThemeSpecimen.svelte';
</script>

<DocsDemo label="One subtree in each scheme">
  {#snippet caption()}
    The same components twice. The left box has the class <code>.scheme-light</code>, the right box
    <code>.scheme-dark</code>, and nothing else differs.
  {/snippet}
  <div class="grid-2">
    <div class="scheme-light surface-bg bordered rounded-container p-4">
      <ThemeSpecimen />
    </div>
    <div class="scheme-dark surface-bg bordered rounded-container p-4">
      <ThemeSpecimen />
    </div>
  </div>
</DocsDemo>
