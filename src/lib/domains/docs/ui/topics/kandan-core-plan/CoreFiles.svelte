<script lang="ts">
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import {
    BEHAVIOURS,
    COMPONENTS,
    ICON_COUNT,
    behaviourCount,
    behaviourLabel,
  } from './core-inventory';
  import type { ComponentBehaviour } from './core-inventory';
  import {
    APPLY_APPEARANCE,
    CHECK_ICON,
    CHECK_SVG,
    GENERATE_ICONS,
    ICON_SVG,
    PINNED_SCHEME,
    THEME_BOOT_IMPORTS,
    THEME_NAMES,
  } from './core-snippets';
  import {
    KANDAN_CORE_SECTIONS,
    VENDORED_CONTRACT_HREF,
    VENDORED_FIRST_PAINT_HREF,
    kandanCoreHref,
  } from './core-sections';

  const BEHAVIOUR_KINDS: readonly ComponentBehaviour[] = [
    'markup',
    'native',
    'native-script',
    'script',
  ];

  const scripted = COMPONENTS.length - behaviourCount('markup');
</script>

<DocsSection title={KANDAN_CORE_SECTIONS.appearance}>
  <p>
    The stylesheets read two attributes on the <code>html</code> element, the theme and a pinned
    color scheme (<a href={VENDORED_CONTRACT_HREF}>The attribute contract</a>). The core's
    <code>appearance.js</code> holds that vocabulary:
  </p>
  <DocsCode label={THEME_NAMES.label} code={THEME_NAMES.code} />
  <p>
    It is plain JavaScript, so a browser and Node load the same file with no build step. The types
    live in JSDoc comments, which a type check reads with <code>checkJs</code>, and the JSDoc
    <code>@type {'{const}'}</code> keeps <code>THEMES</code> a list of literal names rather than
    plain strings. <code>applyAppearance</code> writes both attributes on anything with an element's
    <code>getAttribute</code>, <code>setAttribute</code> and <code>removeAttribute</code>:
  </p>
  <DocsCode label={APPLY_APPEARANCE.label} code={APPLY_APPEARANCE.code} />
  <p>
    The core has no runtime dependency, so where a pattern match could have chosen the pinned
    scheme, an object lookup does:
  </p>
  <DocsCode label={PINNED_SCHEME.label} code={PINNED_SCHEME.code} />
  <p>
    <code>theme-boot.js</code> builds the inline script that sets the attributes before the first
    paint (<a href={VENDORED_FIRST_PAINT_HREF}>The script before the first paint</a>). It imports
    nothing but the appearance script, with the <code>.js</code> extension a browser needs:
  </p>
  <DocsCode label={THEME_BOOT_IMPORTS.label} code={THEME_BOOT_IMPORTS.code} />
  <p>
    An app pastes that script into its page and admits it by its hash. A change to the script's text
    therefore changes every app's hash, which is why the core treats any change to
    <code>themeBootScript</code>'s output as a new major version.
  </p>
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.icons}>
  <p>
    Kandan has {ICON_COUNT} icons, from Lucide or drawn on Lucide's grid. The core holds each one as a
    standalone SVG file, which any page can use as it is:
  </p>
  <DocsCode label={CHECK_SVG.label} code={CHECK_SVG.code} />
  <p>
    <code>kandan-ui-svelte</code> still has one small component per icon that passes its SVG
    elements to a shared <code>Icon.svelte</code>, so a screen imports each icon by its own path. A
    script writes those components from the core's files:
  </p>
  <DocsCode label={GENERATE_ICONS.label} code={GENERATE_ICONS.code} />
  <DocsCode label={CHECK_ICON.label} code={CHECK_ICON.code} />
  <DocsCode label={ICON_SVG.label} code={ICON_SVG.code} />
  <p>
    The written components are committed, and a spec fails when one differs from what the script
    would write, so the folder stays plain files that work at any prefix. Lucide's license is ISC
    (MIT for the icons that came from Feather), on the condition that its copyright notice and
    permission notice appear in all copies, so the license file sits in <code>core/icons/</code> beside
    the SVG files.
  </p>
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.behavior}>
  <p>
    Kandan has {COMPONENTS.length} components. Sorted by where their behavior comes from:
  </p>
  <Table size="sm" caption="Kandan's components by the source of their behavior">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Behavior from</TableHeaderCell>
        <TableHeaderCell>Components</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each BEHAVIOUR_KINDS as kind (kind)}
        <TableRow>
          <TableHeaderCell scope="row">{behaviourLabel(kind)}</TableHeaderCell>
          <TableCell>{behaviourCount(kind)}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    "Markup only" means the component writes HTML from its props and passes events on to the caller.
    Some of these compute their markup with a plain TypeScript helper, such as the edge geometry in
    <code>diagram.ts</code> or the page window in <code>pagination-window.ts</code>;
    <code>kandan-ui-vanilla</code> will need the same computation in plain JavaScript, or a page
    writes that markup by hand. The other {scripted}:
  </p>
  <Table size="sm" caption="The components whose behavior is more than markup">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Component</TableHeaderCell>
        <TableHeaderCell>From</TableHeaderCell>
        <TableHeaderCell>What happens</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each BEHAVIOURS as row (row.component)}
        <TableRow>
          <TableHeaderCell scope="row"><code>{row.component}</code></TableHeaderCell>
          <TableCell>{behaviourLabel(row.behaviour)}</TableCell>
          <TableCell>{row.note}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    These are the components with a rules file beside their fixtures (<a
      href={kandanCoreHref('rules')}>Behavior the markup cannot hold</a
    >), and the ones that will need a behavior module in <code>kandan-ui-vanilla</code>.
  </p>
</DocsSection>
