<script lang="ts">
  import DocsPage from '../../DocsPage.svelte';
  import CascadeSections from './CascadeSections.svelte';
  import ComponentSections from './ComponentSections.svelte';
  import { UI_LIBRARY_SECTIONS } from './sections';
  import StructureSections from './StructureSections.svelte';
  import ThemeSections from './ThemeSections.svelte';
  import TokenSections from './TokenSections.svelte';
  import './ui-library.css';
</script>

<DocsPage slug="ui-library" sections={Object.values(UI_LIBRARY_SECTIONS)}>
  {#snippet lead()}
    Dokseo styles every screen from one set of global stylesheets. Cascade layers fix which rule
    wins, tokens name every value, and a theme swaps the values without touching a component.
  {/snippet}
  <div class="ui-library stack-lg">
    <CascadeSections />
    <TokenSections />
    <ThemeSections />
    <ComponentSections />
    <StructureSections />
  </div>
</DocsPage>
