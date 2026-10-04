<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import BuildConcepts from './production-builds/BuildConcepts.svelte';
  import BuildsInDokseo from './production-builds/BuildsInDokseo.svelte';
  import ShakingConcepts from './production-builds/ShakingConcepts.svelte';
  import { BUILD_SECTIONS } from './production-builds/build-sections';
</script>

<DocsPage slug="production-builds" sections={Object.values(BUILD_SECTIONS)}>
  {#snippet lead()}
    What happens between source modules and the files a server sends: chunks, minification, hashed
    names, tree shaking, dead code and the precache, with real bundler output, then the measured
    build of Dokseo and the changes that keep it small.
  {/snippet}
  <BuildConcepts />
  <ShakingConcepts />
  <BuildsInDokseo />
</DocsPage>
