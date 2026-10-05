<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import CopyToolSections from './vendored-ui-plan/CopyToolSections.svelte';
  import SubtreeSections from './vendored-ui-plan/SubtreeSections.svelte';
  import VendoringConcepts from './vendored-ui-plan/VendoringConcepts.svelte';
  import { VENDORED_PLAN_SECTIONS } from './vendored-ui-plan/vendored-sections';
</script>

<DocsPage slug="vendored-ui-plan" sections={Object.values(VENDORED_PLAN_SECTIONS)}>
  {#snippet lead()}
    What vendoring a library means and what it costs against a published package, how git subtree
    adds, updates, sends back and extracts a vendored folder, the copy tool that would be the
    alternative, and the plan for turning Dokseo's UI library into one that other apps vendor.
  {/snippet}
  <VendoringConcepts />
  <SubtreeSections />
  <CopyToolSections />
</DocsPage>
