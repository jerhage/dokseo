<script lang="ts">
  import DocsSection from '../../DocsSection.svelte';
  import { KANDAN_CORE_SECTIONS, kandanCoreHref } from './core-sections';
</script>

<DocsSection title={KANDAN_CORE_SECTIONS.next}>
  <p>
    <code>kandan-ui-vanilla</code> is the framework version still to come, after 1.0, with no
    framework in it: no Svelte and no React. It will vendor the core at <code>core/</code> with git
    subtree, exactly as <code>kandan-ui-svelte</code> does, and run the same contract spec and the same
    rules against what its code writes. A markup change in the core then fails both versions' specs until
    each matches again.
  </p>
  <p>
    The behaviors will be plain ES modules, one per component that needs a script (<a
      href={kandanCoreHref('behavior')}>Which components run a script</a
    >), each exporting a function that connects it to an element and returns one that disconnects
    it. Custom elements were the alternative, but a custom element adds an element the fixtures do
    not have. The modules start from copies of the Svelte version's plain helpers, such as the tab
    keys in <code>roving.ts</code>; the core holds no behavior code, so neither version can import
    the other's, and the shared rules keep the two copies agreeing. A static playground page will
    show every fixture. An app with no framework will vendor <code>kandan-ui-vanilla</code>, link
    <code>core/styles/index.css</code>, copy a fixture's markup, and import a module where the
    component needs one.
  </p>
</DocsSection>
