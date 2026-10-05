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
    INVENTORY,
    LIBRARY_ROOT,
    SERVER_RENDER_SPEC_COUNT,
    behaviourCount,
    behaviourLabel,
    fateCount,
    fateLabel,
  } from './core-inventory';
  import type { ComponentBehaviour } from './core-inventory';
  import { NODE_TEST_RUN } from './core-runs';
  import {
    APPLY_APPEARANCE,
    CHECK_ICON,
    DESIGN_SPEC_IMPORTS,
    ICON_SVG,
    PINNED_SCHEME,
    THEME_BOOT_IMPORTS,
    THEME_NAMES,
  } from './core-snippets';
  import {
    KANDAN_CORE_SECTIONS,
    VENDORED_CONTRACT_HREF,
    VENDORED_FIRST_PAINT_HREF,
    VENDORED_SUBTREE_HREF,
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

<DocsSection title={KANDAN_CORE_SECTIONS.today}>
  <p>
    Kandan UI lives in its own repository, <code>kandan-ui-svelte</code>, and Dokseo vendors it at
    <code>{LIBRARY_ROOT}/</code> with git subtree (<a href={VENDORED_SUBTREE_HREF}
      >How git subtree works</a
    >). Every file and folder at the top of that folder falls into one of four groups: Core, which
    moves to <code>kandan-ui</code> as it is ({fateCount('core')} rows); Svelte only, which stays ({fateCount(
      'svelte',
    )}); Both, which each repository keeps a copy of ({fateCount('both')}); and Needs work, which is
    framework-free in purpose but not yet in form ({fateCount('work')}).
  </p>
  <Table size="sm" caption="Where each part of {LIBRARY_ROOT}/ goes">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Path</TableHeaderCell>
        <TableHeaderCell>Goes to</TableHeaderCell>
        <TableHeaderCell>Why</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each INVENTORY as row (row.path)}
        <TableRow>
          <TableHeaderCell scope="row"><code>{row.path}</code></TableHeaderCell>
          <TableCell>{fateLabel(row.fate)}</TableCell>
          <TableCell>{row.note}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    A docs spec lists the library folder and fails when an entry is missing from the table or names
    a path that no longer exists.
  </p>
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.appearance}>
  <p>
    <code>appearance.ts</code> holds the attribute contract the stylesheets read (<a
      href={VENDORED_CONTRACT_HREF}>The attribute contract</a
    >): the theme names and the two attributes on the <code>html</code> element.
  </p>
  <DocsCode label={THEME_NAMES.label} code={THEME_NAMES.code} />
  <DocsCode label={APPLY_APPEARANCE.label} code={APPLY_APPEARANCE.code} />
  <p>
    <code>theme-boot.ts</code> builds the inline script that sets those attributes before the first
    paint (<a href={VENDORED_FIRST_PAINT_HREF}>The script before the first paint</a>), and it
    imports nothing but <code>appearance.ts</code>:
  </p>
  <DocsCode label={THEME_BOOT_IMPORTS.label} code={THEME_BOOT_IMPORTS.code} />
  <p>
    Neither file imports Svelte, and no Kandan component imports either of them; only the apps do.
    Still, they are not plain JavaScript yet. They are TypeScript, which a browser does not load
    without a build step. And <code>pinnedScheme</code> calls <code>match</code> from ts-pattern, a package
    the core would otherwise not need:
  </p>
  <DocsCode label={PINNED_SCHEME.label} code={PINNED_SCHEME.code} />
  <p>
    To see how small that gap is, I copied both files out of the repository, replaced the
    <code>match</code> call with an object lookup, and added <code>.ts</code> to the import path. Node
    then imported them with no flag and no package, and a spec written with Node's own test runner passed:
  </p>
  <DocsCode label={NODE_TEST_RUN.label} code={NODE_TEST_RUN.code} />
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.icons}>
  <p>
    Kandan has {ICON_COUNT} icons, all from Lucide. Each is a Svelte file that hands its SVG elements
    to a shared <code>Icon.svelte</code>:
  </p>
  <DocsCode label={CHECK_ICON.label} code={CHECK_ICON.code} />
  <DocsCode label={ICON_SVG.label} code={ICON_SVG.code} />
  <p>
    Those elements are data inside Svelte files, so a plain page cannot use them. In the core, each
    icon becomes an <code>.svg</code> file holding the same elements, and the Svelte files are generated
    from those. Lucide's license is ISC (MIT for the icons that came from Feather), on the condition that
    its copyright notice and permission notice appear in all copies. The library folder holds no license
    file for the icons today; the core's icon folder is the place for one.
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
    <code>diagram.ts</code> or the page window in <code>pagination-window.ts</code>; a plain page
    writes that markup by hand or calls the same helper. The other {scripted}:
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
    These are the components that need rules beside their fixtures (<a
      href={kandanCoreHref('rules')}>Behavior the markup cannot hold</a
    >) and a behavior module in the plain version.
  </p>
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.specs}>
  <p>
    The specs split the same way as the files they check. The stylesheet spec is the clearest case:
    it reads only CSS, yet it imports two TypeScript files from <code>components/</code>, so those
    two have to move with it.
  </p>
  <DocsCode label={DESIGN_SPEC_IMPORTS.label} code={DESIGN_SPEC_IMPORTS.code} />
  <p>
    The spec for the contract itself is less new than it sounds. {SERVER_RENDER_SPEC_COUNT} spec files
    in <code>components/</code> already render components to a string with <code>render</code> from
    <code>svelte/server</code>, in Node, in the same unit project as every other spec. A contract
    spec uses the same call and compares the whole string with a fixture instead of picking out one
    attribute.
  </p>
</DocsSection>
