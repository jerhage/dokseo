<script lang="ts">
  import EpubRenderingPage from '$lib/domains/docs/ui/topics/EpubRenderingPage.svelte';
  import { selectedPassage } from '$lib/domains/flowing/ui/flow-passage';
  import { openFlowSurface } from '$lib/domains/flowing/ui/flow-surface';
  import PageInkProbe from '$lib/domains/flowing/ui/PageInkProbe.svelte';
</script>

<EpubRenderingPage open={openFlowSurface} passage={selectedPassage}>
  {#snippet ink(onink)}<PageInkProbe {onink} />{/snippet}
</EpubRenderingPage>
