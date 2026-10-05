<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import CopyToolSections from './vendored-ui/CopyToolSections.svelte';
  import DokseoPreparation from './vendored-ui/DokseoPreparation.svelte';
  import IntegrationSection from './vendored-ui/IntegrationSection.svelte';
  import SubtreeSections from './vendored-ui/SubtreeSections.svelte';
  import VendoringConcepts from './vendored-ui/VendoringConcepts.svelte';
  import { VENDORED_SECTIONS } from './vendored-ui/vendored-sections';
</script>

<DocsPage slug="vendored-ui" sections={Object.values(VENDORED_SECTIONS)}>
  {#snippet lead()}
    What vendoring a library means and what it costs against a published package, how git subtree
    adds, updates, sends back and extracts a vendored folder, the copy tool that would be the
    alternative, and the plan for turning Dokseo's UI library into one that other apps vendor.
  {/snippet}
  <VendoringConcepts />
  <SubtreeSections />
  <CopyToolSections />
  <DokseoPreparation />
  <IntegrationSection />
</DocsPage>
