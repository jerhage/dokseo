<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import TypeConcepts from './typescript-types/TypeConcepts.svelte';
  import TypesInDokseo from './typescript-types/TypesInDokseo.svelte';
  import TypeTools from './typescript-types/TypeTools.svelte';
  import { TYPE_SECTIONS } from './typescript-types/type-sections';
</script>

<DocsPage slug="typescript-types" sections={Object.values(TYPE_SECTIONS)}>
  {#snippet lead()}
    Designing TypeScript types so a wrong state cannot be written: unions, narrowing, exhaustive
    checks, brands, parsing at the boundary and the alternatives to a cast, with recorded compiler
    output and demos that run Dokseo's real code.
  {/snippet}
  <TypeConcepts />
  <TypeTools />
  <TypesInDokseo />
</DocsPage>
