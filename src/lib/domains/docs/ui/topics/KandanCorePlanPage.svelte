<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import CoreConcepts from './kandan-core-plan/CoreConcepts.svelte';
  import CoreContract from './kandan-core-plan/CoreContract.svelte';
  import CoreFiles from './kandan-core-plan/CoreFiles.svelte';
  import CoreHistory from './kandan-core-plan/CoreHistory.svelte';
  import CoreNext from './kandan-core-plan/CoreNext.svelte';
  import CoreSubtree from './kandan-core-plan/CoreSubtree.svelte';
  import { KANDAN_CORE_SECTIONS } from './kandan-core-plan/core-sections';
</script>

<DocsPage slug="kandan-core-plan" sections={Object.values(KANDAN_CORE_SECTIONS)}>
  {#snippet lead()}
    Which parts of a component library depend on a framework, and how a markup contract keeps
    several versions writing the same HTML. Then Kandan UI's core, kandan-ui: the CSS, fonts, icons
    and appearance script with no component behavior, the fixtures and the rules every framework
    version is held to, and the subtree chain that brings it through kandan-ui-svelte into Dokseo.
    Last, how the core was built and moved into Dokseo, and the version with no framework that comes
    after 1.0.
  {/snippet}
  <CoreConcepts />
  <CoreContract />
  <CoreFiles />
  <CoreSubtree />
  <CoreHistory />
  <CoreNext />
</DocsPage>
