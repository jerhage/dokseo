<script lang="ts">
  import Diagram from '$lib/ui/components/Diagram.svelte';
  import Figure from '$lib/ui/components/Figure.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { LAYER_DIAGRAM } from './diagrams';
  import LayerDemo from './LayerDemo.svelte';
  import { UI_LIBRARY_SECTIONS } from './sections';
  import { IMPORTS_FIRST, IMPORTS_LAST, IMPORTS_MIDDLE, ORDER_STATEMENT } from './snippets';

  const TWO_LAYERS = `@layer components, utilities;

@layer components {
  .btn.is-active {
    color: navy;
  }
}

@layer utilities {
  .text-danger {
    color: red;
  }
}`;
</script>

<DocsSection title={UI_LIBRARY_SECTIONS.problem}>
  <p>
    When two CSS rules set the same property on one element, the browser picks one through the
    cascade. Between two ordinary rules from the same stylesheet origin, it compares their
    <em>specificity</em>, a count of the ids, the classes and the element names in each selector.
    The higher count wins, and on a tie the rule that comes later in the source wins.
  </p>
  <p>
    That holds up in a small stylesheet and wears down in a large one. Say a button component colors
    its pressed state with <code>.btn.is-active</code>, two classes. Later a screen needs one
    pressed button in the danger color, so it adds a helper class, <code>.text-danger</code>, with
    one class. The helper loses, because one class counts less than two. The usual fixes make the
    next conflict worse: a longer selector, an id, or <code>!important</code>. Each one raises the
    count the next rule has to beat, until the only way to know which rule wins is to open the
    developer tools.
  </p>
</DocsSection>

<DocsSection title={UI_LIBRARY_SECTIONS.layers}>
  <p>
    A cascade layer is a named bucket of rules, declared with <code>@layer</code>. The browser
    compares layers before it compares specificity. For ordinary declarations, a rule in a later
    layer beats a rule in an earlier layer whatever their selectors, and specificity and source
    order only settle a tie between rules inside the same layer. In the example below the helper
    wins, with one class against two.
  </p>
  <DocsCode label="Two layers, declared in order" code={TWO_LAYERS} />
  <p>Three details matter in a real project.</p>
  <ul>
    <li>
      The order is fixed the first time the browser reads each layer name. A one-line statement that
      lists every name, read before any rule, fixes the order for the whole page.
    </li>
    <li>
      A rule outside every layer beats every layered rule. One unlayered stylesheet anywhere on the
      page outranks the whole system.
    </li>
    <li>
      <code>!important</code> reverses the order: an important declaration in the first layer beats one
      in the last. The design system's stylesheets never use it.
    </li>
  </ul>
</DocsSection>

<DocsSection title={UI_LIBRARY_SECTIONS.dokseoLayers}>
  <p>
    Dokseo declares eight layers. The statement sits in an inline <code>&lt;style&gt;</code> in
    <code>src/app.html</code>, ahead of <code>%sveltekit.head%</code>, so it is the first CSS the
    browser reads. It has to be first: a domain component imports its own stylesheet, which can
    reach the page before the design system's entry file, and if that stylesheet were the first to
    name <code>features</code>, it would place <code>features</code> before every other layer.
  </p>
  <DocsCode label={ORDER_STATEMENT.label} code={ORDER_STATEMENT.code} />
  <Figure>
    <Diagram
      label="The eight layers in declared order, from open-props to overrides; each layer is beaten by the one after it"
      width={LAYER_DIAGRAM.width}
      height={LAYER_DIAGRAM.height}
      nodes={LAYER_DIAGRAM.nodes}
      edges={LAYER_DIAGRAM.edges}
    />
    {#snippet caption()}Declared order, top to bottom. The last layer wins.{/snippet}
  </Figure>
  <p>
    The entry file, <code>src/lib/ui/styles/index.css</code>, repeats the statement, which changes
    nothing, and then imports every design-system file. Each import names its layer with
    <code>layer()</code>, and the files themselves hold bare rules, so one file shows where every
    rule lives. The root layout imports <code>index.css</code> once, and every class it defines is global
    from then on.
  </p>
  <DocsCode label={IMPORTS_FIRST.label} code={IMPORTS_FIRST.code} />
  <DocsCode label={IMPORTS_MIDDLE.label} code={IMPORTS_MIDDLE.code} />
  <DocsCode label={IMPORTS_LAST.label} code={IMPORTS_LAST.code} />
  <ul>
    <li><code>open-props</code> is declared and receives no import.</li>
    <li><code>reset</code> holds Josh W. Comeau's modern CSS reset, element selectors only.</li>
    <li>
      <code>base</code> holds the raw values, the theme files, and element defaults such as the body font.
    </li>
    <li><code>tokens</code> gives those values their semantic names.</li>
    <li><code>components</code> holds one file per base component, class selectors only.</li>
    <li>
      <code>features</code> holds the few stylesheets that belong to one domain component.
    </li>
    <li>
      <code>utilities</code> holds small single-purpose classes and every <code>@keyframes</code>.
    </li>
    <li>
      <code>overrides</code> holds narrow fixes: print, reduced motion, forced colors, and
      <code>.btn.btn-pill</code>.
    </li>
  </ul>
  <p>
    The second detail explains why no Svelte file in Dokseo has a style block. Svelte compiles a
    component's <code>&lt;style&gt;</code> block into ordinary CSS with no layer, so a single block would
    outrank every layer.
  </p>
  <p>
    The demo holds one real <code>Button</code>. Its <code>active</code> prop adds
    <code>.is-active</code>, styled in the components layer by <code>.btn.is-active</code>. The
    <code>.text-danger</code> switch adds a utility with one class, and it wins once it is on. The
    <code>pill</code> prop adds <code>.btn-pill</code>, which the overrides layer rounds through
    <code>.btn.btn-pill</code>, so the <code>.rounded-control</code> utility cannot square it again.
  </p>
  <LayerDemo />
</DocsSection>
