<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import CopyToolSections from './vendored-ui/CopyToolSections.svelte';
  import DokseoPreparation from './vendored-ui/DokseoPreparation.svelte';
  import IntegrationSection from './vendored-ui/IntegrationSection.svelte';
  import KandanInDokseo from './vendored-ui/KandanInDokseo.svelte';
  import SubtreeSections from './vendored-ui/SubtreeSections.svelte';
  import VendoringConcepts from './vendored-ui/VendoringConcepts.svelte';
  import { VENDORED_SECTIONS } from './vendored-ui/vendored-sections';
</script>

<DocsPage slug="vendored-ui" sections={Object.values(VENDORED_SECTIONS)}>
  {#snippet lead()}
    What vendoring a library means and what it costs against a published package, how git subtree
    adds, updates, sends back and extracts a vendored folder, and the copy tool that would be the
    alternative. Then Kandan UI, the UI library Dokseo vendors with git subtree: how Dokseo
    integrates it, ignores its tooling and takes its updates, and how it was extracted from Dokseo.
  {/snippet}
  <VendoringConcepts />
  <SubtreeSections />
  <CopyToolSections />
  <KandanInDokseo />
  <IntegrationSection />
  <DokseoPreparation />
</DocsPage>
