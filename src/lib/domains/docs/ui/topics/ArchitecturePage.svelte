<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import ArchitectureConcepts from './architecture/ArchitectureConcepts.svelte';
  import ArchitectureFlow from './architecture/ArchitectureFlow.svelte';
  import ArchitectureLayout from './architecture/ArchitectureLayout.svelte';
  import { ARCHITECTURE_SECTIONS } from './architecture/architecture-sections';
</script>

<DocsPage slug="architecture" sections={Object.values(ARCHITECTURE_SECTIONS)}>
  {#snippet lead()}
    How Dokseo's code is divided, which way every import points, and the tools that fail the build
    when one points the wrong way, with demos that run the real rules and a real use case.
  {/snippet}
  <ArchitectureConcepts />
  <ArchitectureLayout />
  <ArchitectureFlow />
</DocsPage>
