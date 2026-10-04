<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import AccessibilityConcepts from './accessibility/AccessibilityConcepts.svelte';
  import AccessibilityInDokseo from './accessibility/AccessibilityInDokseo.svelte';
  import AccessibilityInteraction from './accessibility/AccessibilityInteraction.svelte';
  import { ACCESSIBILITY_SECTIONS } from './accessibility/accessibility-sections';
</script>

<DocsPage slug="accessibility" sections={Object.values(ACCESSIBILITY_SECTIONS)}>
  {#snippet lead()}
    How a page reaches people who use a keyboard, a screen reader, voice control or a switch: the
    accessibility tree, names, focus, keys, dialogs and announcements, then how Dokseo's readers and
    components handle each. The demos run Dokseo's real components in this browser.
  {/snippet}
  <AccessibilityConcepts />
  <AccessibilityInteraction />
  <AccessibilityInDokseo />
</DocsPage>
