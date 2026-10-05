<script lang="ts">
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { contractCase } from './contract-cases';
  import { ACCORDION_DETAILS, DROPZONE_FOCUS, POPOVER_ATTRIBUTES } from './core-snippets';
  import {
    ACCESSIBILITY_DIALOGS_HREF,
    ACCESSIBILITY_NATIVE_HREF,
    KANDAN_CORE_SECTIONS,
    kandanCoreHref,
  } from './core-sections';

  const PARTS = [
    {
      part: 'CSS',
      depends: 'No',
      example:
        'A stylesheet matches classes and attributes, whichever code wrote them. .badge-success styles a span from Svelte, React or a hand-written page alike.',
    },
    {
      part: 'Fonts and icons',
      depends: 'No',
      example: 'Font files and SVG drawings are plain files.',
    },
    {
      part: 'Markup',
      depends: 'The result does not; the code that writes it does',
      example:
        'A Svelte template and a JSX function can both produce <span class="badge badge-success">, in different ways.',
    },
    {
      part: 'Behavior',
      depends: 'Partly',
      example:
        'A details element opens with no script. Arrow keys that move between tabs need a script, and each framework attaches it differently.',
    },
  ] as const;

  const OPTIONS = [
    {
      option: 'Copy the components and rewrite them by hand',
      gains: 'Nothing to build.',
      costs:
        'Every fix is made twice, and no check fails when one copy gains a class or an ARIA attribute the other lacks.',
    },
    {
      option: 'Generate every version from one template',
      gains: 'One source for the markup.',
      costs:
        'A generator to write and keep working, and each framework has its own ideas (snippets, bindings, hooks) that a shared template expresses poorly.',
    },
    {
      option: 'Web components',
      gains: 'One implementation that runs inside any framework.',
      costs:
        'The custom element is an extra element in the markup, a shadow root keeps page styles out unless they are passed in, and rendering one on the server needs declarative shadow DOM.',
    },
    {
      option: 'A shared core, fixtures, and a contract test per framework',
      gains:
        'CSS, fonts, icons and the attribute contract are written once. A test fails as soon as a framework writes different markup.',
      costs:
        'A fixture per variant, a contract spec per framework, and behavior still written once per framework.',
    },
  ] as const;
</script>

<DocsSection title={KANDAN_CORE_SECTIONS.frameworks}>
  <p>
    A component library for one framework ships components written in that framework. A Svelte
    button is a <code>.svelte</code> file; a React button is a function that returns JSX. Each of those
    files mixes the CSS that styles the component, the HTML it writes, and the script that reacts to clicks,
    keys and pointers.
  </p>
  <p>
    To get the same components in a second framework, the usual move is to copy them and rewrite
    each one. From then on every fix has to be made twice. Miss one, and the copies drift apart: a
    class added to the Svelte button never reaches the React one, and the page looks right in one
    app and wrong in the other.
  </p>
  <p>
    Kandan UI is the library Dokseo vendors, and it exists only as Svelte 5 components today, in the <code
      >kandan-ui-svelte</code
    >
    repository. The plan is to split it into a core,
    <code>kandan-ui</code>, holding everything that does not depend on a framework, and the Svelte
    version built on that core.
  </p>
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.parts}>
  <p>Taking the three parts one at a time shows how much of a component a framework really owns:</p>
  <Table size="sm" caption="Which part of a component depends on the framework">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Part</TableHeaderCell>
        <TableHeaderCell>Depends on the framework?</TableHeaderCell>
        <TableHeaderCell>Example</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each PARTS as row (row.part)}
        <TableRow>
          <TableHeaderCell scope="row">{row.part}</TableHeaderCell>
          <TableCell>{row.depends}</TableCell>
          <TableCell>{row.example}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    The CSS, the fonts and the icons can move out of the framework as they are. The markup is the
    interesting part: the code that writes it belongs to a framework, but the HTML that comes out
    does not.
  </p>
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.contract}>
  <p>
    Since every version has to write the same HTML for the CSS to work, that HTML can be written
    down once, outside any framework. A <em>fixture</em> is such a file: the exact elements, classes,
    attributes and ARIA states a component writes for one variant. The fixture for a success badge with
    the text "Read":
  </p>
  <DocsCode label="A fixture: Badge, success" code={contractCase('badge-success').fixture} />
  <p>
    A fixture becomes a <em>contract</em> when a test holds each framework to it: the test renders
    that framework's component for the same variant and fails if the HTML differs. The CSS is then
    written against the fixtures alone, because every version is checked to write the same markup.
    How such a test reads and compares HTML is covered in
    <a href={kandanCoreHref('spec')}>The contract spec</a>.
  </p>
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.native}>
  <p>
    Behavior is the part a fixture cannot hold, so the less of it a component needs from a script,
    the less there is to write again in every framework. Browsers now ship several behaviors as
    elements and attributes (<a href={ACCESSIBILITY_NATIVE_HREF}>Native HTML before ARIA</a>):
  </p>
  <ul>
    <li>
      <code>&lt;details&gt;</code> and <code>&lt;summary&gt;</code> open and close a disclosure with no
      script. Kandan's accordion item is one:
    </li>
  </ul>
  <DocsCode label={ACCORDION_DETAILS.label} code={ACCORDION_DETAILS.code} />
  <ul>
    <li>
      <code>&lt;dialog&gt;</code> opened with <code>showModal()</code> makes the rest of the page
      inert and closes on Escape (<a href={ACCESSIBILITY_DIALOGS_HREF}
        >Modal dialogs and focus traps</a
      >).
    </li>
    <li>
      The <code>popover</code> attribute puts an element in the top layer, and a button with
      <code>popovertarget</code> shows and hides it. An <code>auto</code> popover also closes on a click
      outside it or on Escape, which MDN calls light dismiss.
    </li>
  </ul>
  <DocsCode label={POPOVER_ATTRIBUTES.label} code={POPOVER_ATTRIBUTES.code} />
  <ul>
    <li>
      The CSS selector <code>:has()</code> styles a wrapper from the state of something inside it, so
      no script has to copy that state onto a class:
    </li>
  </ul>
  <DocsCode label={DROPZONE_FOCUS.label} code={DROPZONE_FOCUS.code} />
  <p>
    Each of these behaves the same whichever framework wrote the element. A plain page gets the
    behavior from the fixture's markup alone.
  </p>
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.options}>
  <p>Keeping two versions of a library in step can be done in several ways:</p>
  <Table size="sm" caption="Ways to keep two versions of a component library in step">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Option</TableHeaderCell>
        <TableHeaderCell>Gains</TableHeaderCell>
        <TableHeaderCell>Costs</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each OPTIONS as row (row.option)}
        <TableRow>
          <TableHeaderCell scope="row">{row.option}</TableHeaderCell>
          <TableCell>{row.gains}</TableCell>
          <TableCell>{row.costs}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    I chose the last. Kandan's components are mostly markup, as the next sections show, so most of
    the library moves into the core or is checked against it, and the behavior left to write per
    framework is small.
  </p>
</DocsSection>
