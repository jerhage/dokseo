<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import CoreConcepts from './kandan-core-plan/CoreConcepts.svelte';
  import CorePlanContract from './kandan-core-plan/CorePlanContract.svelte';
  import CorePlanNext from './kandan-core-plan/CorePlanNext.svelte';
  import CorePlanSubtree from './kandan-core-plan/CorePlanSubtree.svelte';
  import KandanToday from './kandan-core-plan/KandanToday.svelte';
  import { KANDAN_CORE_SECTIONS } from './kandan-core-plan/core-sections';
</script>

<DocsPage slug="kandan-core-plan" sections={Object.values(KANDAN_CORE_SECTIONS)}>
  {#snippet lead()}
    Which parts of a component library depend on a framework, how a markup contract keeps several
    versions writing the same HTML, and the plan for Kandan UI after 1.0: a core, kandan-ui, with
    the CSS, fonts, icons, fixtures and the appearance script and no component behavior, vendored
    with git subtree by two framework versions, kandan-ui-svelte and kandan-ui-vanilla, each held to
    the fixtures by a contract spec, and the update chain from the core to Dokseo.
  {/snippet}
  <CoreConcepts />
  <KandanToday />
  <CorePlanContract />
  <CorePlanSubtree />
  <CorePlanNext />
</DocsPage>
