<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import UnicodeConcepts from './unicode/UnicodeConcepts.svelte';
  import UnicodeInDokseo from './unicode/UnicodeInDokseo.svelte';
  import UnicodeLayout from './unicode/UnicodeLayout.svelte';
  import { UNICODE_SECTIONS } from './unicode/unicode-sections';
</script>

<DocsPage slug="unicode" sections={Object.values(UNICODE_SECTIONS)}>
  {#snippet lead()}
    Why a Japanese string is not a list of characters: code points, UTF-16 and graphemes,
    normalization, comparison, word and line breaks, vertical text and ruby, with live demos that
    run this browser's own text APIs and Dokseo's real folding code.
  {/snippet}
  <UnicodeConcepts />
  <UnicodeLayout />
  <UnicodeInDokseo />
</DocsPage>
