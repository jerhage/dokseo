<script lang="ts">
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { UI_LIBRARY_SECTIONS } from './sections';
  import VariantGallery from './VariantGallery.svelte';

  const TABLES = `const BUTTON_VARIANTS: Readonly<Record<ButtonVariant, ClassList>> = {
  default: [],
  primary: ['btn-primary'],
  accent: ['btn-accent'],
  outline: ['btn-outline', 'btn-primary'],
  ghost: ['btn-ghost'],
  danger: ['btn-danger'],
  'ghost-danger': ['btn-ghost', 'btn-danger'],
};

const BUTTON_SIZES: Readonly<Record<ControlSize, ClassList>> = {
  sm: ['btn-sm'],
  md: [],
  lg: ['btn-lg'],
};`;

  const RUNTIME_MARKUP = `<div class="page-frame" style:--page-ratio={ratio}>`;

  const FEATURE = `@layer features {
  @scope (.page-frame) {
    :scope {
      block-size: 100%;
      aspect-ratio: var(--page-ratio, var(--ratio-portrait));
    }
    .picture {
      position: absolute;
      inset: 0;
    }
  }
}`;
</script>

<DocsSection title={UI_LIBRARY_SECTIONS.components}>
  <p>
    In many component libraries each component ships its own CSS. Dokseo splits the work the other
    way. A Svelte component in <code>src/lib/components/</code> owns the markup, the behavior and
    the accessibility; the global stylesheet owns how it looks. <code>Button.svelte</code> writes
    <code>class="btn btn-primary btn-sm"</code>, and <code>components/btn.css</code> styles those classes.
    The classes also work on plain markup: the app shell, for one, is a set of layout classes written
    on ordinary elements.
  </p>
  <p>
    A prop that picks a look maps to classes through a table in
    <code>src/lib/components/classes.ts</code>. The table is typed by the prop's union, so a new
    variant fails to compile until it has classes. A default adds no class: <code>md</code> is the
    size <code>.btn</code> already has.
  </p>
  <DocsCode label="src/lib/components/classes.ts, excerpt" code={TABLES} />
  <VariantGallery />
  <p>
    Some values exist only at runtime: the aspect ratio of a page image, the position of a
    selection, the height of a dragged sheet. These cross into CSS one way only, as a custom
    property set with Svelte's <code>style:</code> directive, and a stylesheet reads the property with
    a fallback. The page frame of the image reader measures its picture and passes the ratio.
  </p>
  <DocsCode label="PageFrame.svelte, the binding, simplified" code={RUNTIME_MARKUP} />
  <p>
    The binding holds a measurement and nothing else. Colors, spacing and every other design value
    stay in a layered stylesheet, where a theme can reach them.
  </p>
</DocsSection>

<DocsSection title={UI_LIBRARY_SECTIONS.classes}>
  <p>Every class in the library follows one pattern.</p>
  <ul>
    <li>
      A block names the component: <code>.card</code>. It sits on the component's root element.
    </li>
    <li>
      A part adds a name for its role, never its content: <code>.card-title</code>,
      <code>.card-footer</code>. The same role has the same word everywhere: <code>-title</code>
      heads a container, <code>-label</code> names a control, <code>-actions</code> holds buttons.
    </li>
    <li>
      A modifier is chosen when the markup is written: <code>.card-elevated</code>,
      <code>.btn-sm</code>. Sizes are <code>-sm</code> and <code>-lg</code>, and the default has no
      class.
    </li>
    <li>
      A state class starts with <code>is-</code> and changes while the component lives:
      <code>.is-active</code>, <code>.is-open</code>.
    </li>
    <li>
      Tone and emphasis are separate classes that combine. The <code>ghost-danger</code> button is
      <code>.btn-ghost.btn-danger</code>, never one class that means both.
    </li>
    <li>
      No library class contains an app word. The accent outline around a region is
      <code>.region-box-accent</code>, named for how it looks rather than for what the region holds.
    </li>
  </ul>
  <p>
    Two tests check the markup against the stylesheets. One collects every class that every
    <code>.svelte</code> file writes, in class attributes, class props, class expressions and
    <code>class:</code> directives, and fails when a class whose first word names a library family,
    such as <code>btn</code>, appears in no stylesheet. A typo such as <code>btn-primry</code> fails
    it. The other checks that the tables in
    <code>classes.ts</code> name only classes that exist, and that no two variants in a table produce
    the same list.
  </p>
</DocsSection>

<DocsSection title={UI_LIBRARY_SECTIONS.features}>
  <p>
    Some screens need a rule the library cannot express. The first option is to redesign the screen
    from the library. The second is to add a domain-free variant or component to the library, and
    show it in the playground. Only then does a domain write its own CSS, in a file beside the
    component that imports it.
  </p>
  <p>
    That file is exactly one <code>@layer features</code> block holding exactly one
    <code>@scope</code> block. It names its own layer because the design system never imports from a
    domain, so <code>index.css</code> cannot assign one. The <code>@scope</code> rule limits every
    selector inside it to the subtree under the component's root element, so a short class such as
    <code>.picture</code> cannot match anything elsewhere on the page.
  </p>
  <DocsCode label="src/lib/domains/viewing/ui/page-frame.css, excerpt" code={FEATURE} />
  <p>
    The position of <code>features</code> in the layer order is deliberate. It comes after
    <code>components</code>, so a feature rule can place and size a library component. It comes
    before <code>utilities</code>, so a utility class on the same element still wins. A feature rule
    must not restyle a component's insides; a component that has to look different gets a part or a
    modifier in the library.
  </p>
</DocsSection>
