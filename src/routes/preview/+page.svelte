<script lang="ts">
  import { activeComparison } from './comparison';

  const comparison = activeComparison();
</script>

{#if comparison === null}
  <p class="p-4 text-muted">No design comparison is active.</p>
{:else}
  <p class="p-4 text-muted">
    Comparing {comparison.title.toLowerCase()}: choose a variant above.
  </p>
{/if}
