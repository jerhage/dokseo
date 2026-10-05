<script lang="ts">
  import Diagram from '$lib/ui/components/Diagram.svelte';
  import Figure from '$lib/ui/components/Figure.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { TOKEN_DIAGRAM } from './diagrams';
  import { UI_LIBRARY_SECTIONS } from './sections';
  import {
    BASE_PALETTE,
    BASE_ROLES,
    BUTTON_TONE,
    EMBER_PALETTE,
    EMBER_ROLES,
    PIXEL_LENGTH,
    PRIMITIVE_NAMES,
    REGISTERED,
    REGISTERED_VALUE,
    SEMANTIC_COLOR,
    SEMANTIC_RADIUS,
    SEMANTIC_SPACE,
    TOKEN_DIAGRAM_LABEL,
  } from './snippets';
  import TokenInspector from './TokenInspector.svelte';
  import TokenLengthDemo from './TokenLengthDemo.svelte';
</script>

<DocsSection title={UI_LIBRARY_SECTIONS.tokens}>
  <p>
    A design token is a named value: a color, a spacing step, a corner radius, a duration. In CSS it
    is a custom property, and a rule reads it with <code>var()</code>, so a component writes
    <code>padding: var(--sp-4)</code> where it would otherwise write <code>padding: 1rem</code>.
  </p>
  <p>
    The name earns its place in two ways. A value lives in one place, so changing it changes every
    rule that reads it. And the name says what the value is for. A bare <code>16px</code> could be a
    gap, a font size or an icon size; when a theme needs roomier spacing, every <code>16px</code> in
    the code has to be found and judged by hand. That is why Dokseo writes no bare numbers in its
    CSS beyond structural ones such as <code>0</code>, <code>100%</code> and <code>1fr</code>, and
    why a value takes a token from its own family: a font size reads a font-size token even when a
    spacing token has the same value.
  </p>
  <p>
    A common split uses two kinds of name. A <em>primitive</em> names a raw value for what it is: a
    step on the spacing scale, a shade of one hue. A <em>semantic</em> token names a value for its job:
    the primary color, the radius of a control. Components read only semantic tokens. A theme changes
    primitives, and every component follows without a change of its own.
  </p>
</DocsSection>

<DocsSection title={UI_LIBRARY_SECTIONS.dokseoTokens}>
  <p>
    In Dokseo every primitive starts with <code>{PRIMITIVE_NAMES.prefix}</code> and lives in the
    <code>base</code>
    layer, in <code>src/lib/ui/styles/base/</code>. A value no theme changes, such as a spacing
    step, is a plain primitive in <code>base/primitives.css</code>. A value a theme can change takes
    one more step. Each theme file names its palette after the color (<code
      >{PRIMITIVE_NAMES.spruce}</code
    >), then assigns <em>role primitives</em>, names for the job such as
    <code>{PRIMITIVE_NAMES.primary}</code>
    or
    <code>{PRIMITIVE_NAMES.radiusControl}</code>. Every theme assigns the same set of role
    primitives. The semantic tokens in the <code>tokens</code> layer map each name straight to one primitive,
    the same way under every theme.
  </p>
  <Figure>
    <Diagram
      label={TOKEN_DIAGRAM_LABEL}
      width={TOKEN_DIAGRAM.width}
      height={TOKEN_DIAGRAM.height}
      nodes={TOKEN_DIAGRAM.nodes}
      edges={TOKEN_DIAGRAM.edges}
    />
    {#snippet caption()}From a raw color to a component, under the default theme.{/snippet}
  </Figure>
  <DocsCode label={BASE_PALETTE.label} code={BASE_PALETTE.code} />
  <DocsCode label={BASE_ROLES.label} code={BASE_ROLES.code} />
  <DocsCode label={EMBER_PALETTE.label} code={EMBER_PALETTE.code} />
  <DocsCode label={EMBER_ROLES.label} code={EMBER_ROLES.code} />
  <DocsCode label={SEMANTIC_COLOR.label} code={SEMANTIC_COLOR.code} />
  <DocsCode label={SEMANTIC_SPACE.label} code={SEMANTIC_SPACE.code} />
  <DocsCode label={SEMANTIC_RADIUS.label} code={SEMANTIC_RADIUS.code} />
  <DocsCode label={BUTTON_TONE.label} code={BUTTON_TONE.code} />
  <p>
    The button rule reads <code>--color-primary</code> into custom properties of its own. A leading
    underscore, as in <code>--_btn-tone-bg</code>, marks a property private to one component: the
    base <code>.btn</code> rule paints from them, and each tone and emphasis class only reassigns them.
  </p>
  <p>
    The inspector follows one name down that chain on this page's root element. For each name it
    collects the rules that declare it and match <code>&lt;html&gt;</code>, ranks them by layer,
    specificity and order as the cascade does, and moves on while the winning value is a lone
    <code>var()</code>. Pick another theme at the top of the page and
    <code>{PRIMITIVE_NAMES.primary}</code> moves to that theme's rule.
  </p>
  <TokenInspector />
  <p>
    The last value in a color chain is a <code>light-dark()</code> pair, and the custom properties
    above it hold that pair as text. The computed value of an ordinary custom property is its text
    with every <code>var()</code> replaced, so <code>--color-primary</code> on the root computes to
    the whole pair. A half is chosen only where a real property, such as
    <code>background-color</code> on the swatch, uses it.
  </p>
</DocsSection>

<DocsSection title={UI_LIBRARY_SECTIONS.script}>
  <p>
    A few pieces of TypeScript need a token as a number. The carousel needs the gap between slides
    for its geometry, and overlay placement needs the gap below a trigger and the margin from the
    screen edge. Copying the number into TypeScript would let the two drift apart the first time
    someone changes the token, so the script reads the token instead.
  </p>
  <p>
    Reading it is not as simple as it looks. <code>getPropertyValue('--sp-4')</code> returns the
    text <code>"1rem"</code>, and parsing that as pixels gives 1. So Dokseo registers each length
    token that script reads, such as <code>--carousel-gap</code>, with <code>@property</code> and
    the syntax
    <code>'&lt;length&gt;'</code>. The browser then computes a registered property like any length,
    in pixels, and <code>getPropertyValue('--carousel-gap')</code> returns <code>"16px"</code>. The
    declaration stays an ordinary token, so the rest of the system treats it like any other.
  </p>
  <DocsCode label={REGISTERED.label} code={REGISTERED.code} />
  <DocsCode label={REGISTERED_VALUE.label} code={REGISTERED_VALUE.code} />
  <DocsCode label={PIXEL_LENGTH.label} code={PIXEL_LENGTH.code} />
  <TokenLengthDemo />
  <p>
    Media and container queries cannot read a custom property at all, so a breakpoint is written out
    as a length in each query. The narrow breakpoint, <code>48rem</code>, is the primitive
    <code>{PRIMITIVE_NAMES.sizeNarrow}</code>, and a test checks that every query that switches at
    it uses that exact value, and that the TypeScript query <code>NARROW_SCREEN_QUERY</code> does too.
  </p>
</DocsSection>
