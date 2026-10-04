<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import TestingConcepts from './testing/TestingConcepts.svelte';
  import TestingInDokseo from './testing/TestingInDokseo.svelte';
  import TestingLessons from './testing/TestingLessons.svelte';
  import { TESTING_SECTIONS } from './testing/testing-sections';
</script>

<DocsPage slug="testing" sections={Object.values(TESTING_SECTIONS)}>
  {#snippet lead()}
    Which kind of test reaches which bug, why Dokseo writes unit tests by default, and how to show
    that a test catches anything at all, with demos that run real functions and a real use case
    against recorded cases.
  {/snippet}
  <TestingConcepts />
  <TestingInDokseo />
  <TestingLessons />
</DocsPage>
