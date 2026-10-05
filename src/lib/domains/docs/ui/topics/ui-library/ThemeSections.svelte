<script lang="ts">
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import SchemeDemo from './SchemeDemo.svelte';
  import { UI_LIBRARY_SECTIONS } from './sections';
  import { FRAME, PRIMITIVE_NAMES, SCHEME, SCHEME_UTILITIES } from './snippets';
  import ThemeFrame from './ThemeFrame.svelte';
</script>

<DocsSection title={UI_LIBRARY_SECTIONS.schemes}>
  <p>
    Dokseo separates two choices that are easy to mix up. A <em>color scheme</em> is light or dark.
    A <em>theme</em> is a visual identity: a palette, fonts, corner radii, motion. Each of the eight themes
    has a light and a dark scheme, so dark is never a theme of its own.
  </p>
  <p>
    The CSS <code>color-scheme</code> property declares which schemes an element supports. The value
    <code>light dark</code>
    follows the operating system, the preference that the
    <code>prefers-color-scheme</code> media feature reports. The function
    <code>light-dark(a, b)</code> gives <code>a</code> when the element's used scheme is light and
    <code>b</code> when it is dark. Dokseo writes every color that differs between schemes once, as
    such a pair, and switches only the <code>color-scheme</code> property.
  </p>
  <DocsCode label={SCHEME.label} code={SCHEME.code} />
  <p>
    Automatic is the absence of the attribute, so removing <code>data-color-scheme</code> returns to
    the system's choice with no script. Form controls and scrollbars follow
    <code>color-scheme</code> too, so the page and the browser's own controls cannot disagree. No
    theme file contains a <code>prefers-color-scheme</code> query, and a test holds that.
  </p>
  <p>
    Because <code>color-scheme</code> inherits and <code>light-dark()</code> resolves on the element that
    uses the color, any subtree can pin its own scheme. Two utilities do exactly that.
  </p>
  <DocsCode label={SCHEME_UTILITIES.label} code={SCHEME_UTILITIES.code} />
  <SchemeDemo />
</DocsSection>

<DocsSection title={UI_LIBRARY_SECTIONS.themes}>
  <p>
    A theme is the <code>data-theme</code> attribute on <code>&lt;html&gt;</code>. Each theme is one
    file in <code>src/lib/ui/core/styles/base/themes/</code> with two rules, both on
    <code>:root[data-theme='name']</code>: its palette, then its role primitives. The default
    theme's rules also match a bare <code>:root</code>, so a page with no attribute still renders
    completely. A theme never touches a semantic token or a component.
  </p>
  <p>
    A scheme can be pinned on a subtree; a theme cannot. Every semantic token is declared on
    <code>:root</code> only, so its value is worked out once, on the root, from the root's
    primitives. A descendant that sets its own <code>{PRIMITIVE_NAMES.primary}</code> changes
    nothing for
    <code>--color-primary</code>, which it inherits ready-made. To show a second theme next to this
    page, the demo uses a second document: an <code>iframe</code> with its own root element.
  </p>
  <DocsCode label={FRAME.label} code={FRAME.code} />
  <ThemeFrame />
  <p>
    The attributes on the real page are set before it first paints. An inline script in
    <code>src/app.html</code> reads <code>reader.theme</code> and <code>reader.color-scheme</code>
    from <code>localStorage</code>, checks each against the known names, and sets the attributes.
    Without it, a reader who pinned the dark scheme on a light system would see a light page for a
    moment on every load, until the app's own code ran and set the attribute.
  </p>
</DocsSection>
