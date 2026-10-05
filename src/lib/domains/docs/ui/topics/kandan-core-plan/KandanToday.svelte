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
    ADDED,
    BEHAVIOURS,
    COMPONENTS,
    FIXTURE_COUNT,
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
    >). Before the core existed, every file and folder at the top of that folder fell into one of
    four groups: Core, which could move to <code>kandan-ui</code> as it was ({fateCount('core')}
    rows); Svelte only, which would stay ({fateCount('svelte')}); Both, which each repository would
    keep a copy of ({fateCount('both')}); and Needs work, which was framework-free in purpose but
    not yet in form ({fateCount('work')}). The last column shows where each one is now, relative to
    <code>{LIBRARY_ROOT}/</code>:
  </p>
  <Table size="sm" caption="Where each part of {LIBRARY_ROOT}/ went">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Path before</TableHeaderCell>
        <TableHeaderCell>Planned</TableHeaderCell>
        <TableHeaderCell>Why</TableHeaderCell>
        <TableHeaderCell>Now at</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each INVENTORY as row (row.path)}
        <TableRow>
          <TableHeaderCell scope="row"><code>{row.path}</code></TableHeaderCell>
          <TableCell>{fateLabel(row.fate)}</TableCell>
          <TableCell>{row.note}</TableCell>
          <TableCell>
            {#each row.now as path, index (path)}{#if index > 0},{' '}{/if}<code>{path}</code
              >{/each}
          </TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>The move also added files with no counterpart before:</p>
  <Table size="sm" caption="New in {LIBRARY_ROOT}/ with the core">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Path</TableHeaderCell>
        <TableHeaderCell>What it holds</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each ADDED as row (row.path)}
        <TableRow>
          <TableHeaderCell scope="row"><code>{row.path}</code></TableHeaderCell>
          <TableCell>{row.note}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    A docs spec lists the library folder and its <code>core/</code>, and fails when an entry is
    missing from both tables or a path in them no longer exists.
  </p>
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.appearance}>
  <p>
    <code>appearance.ts</code> held the attribute contract the stylesheets read (<a
      href={VENDORED_CONTRACT_HREF}>The attribute contract</a
    >): the theme names and the two attributes on the <code>html</code> element.
    <code>theme-boot.ts</code> built the inline script that sets those attributes before the first
    paint (<a href={VENDORED_FIRST_PAINT_HREF}>The script before the first paint</a>), and it
    imported nothing but <code>appearance.ts</code>.
  </p>
  <p>
    Neither file imported Svelte, and no Kandan component imported either of them; only the apps
    did. Still, they were not plain JavaScript. They were TypeScript, which a browser does not load
    without a build step. And <code>pinnedScheme</code> called <code>match</code> from ts-pattern, a package
    the core would otherwise not need.
  </p>
  <p>
    To see how small that gap was, I copied both files out of the repository, replaced the
    <code>match</code> call with an object lookup, and added <code>.ts</code> to the import path. Node
    then imported them with no flag and no package, and a spec written with Node's own test runner passed:
  </p>
  <DocsCode label={NODE_TEST_RUN.label} code={NODE_TEST_RUN.code} />
  <p>
    The core's version is that, written as plain JavaScript. The types moved into JSDoc comments,
    which the type check reads with <code>checkJs</code>, and a JSDoc <code>@type {'{const}'}</code>
    keeps <code>THEMES</code> a list of literal names:
  </p>
  <DocsCode label={THEME_NAMES.label} code={THEME_NAMES.code} />
  <DocsCode label={APPLY_APPEARANCE.label} code={APPLY_APPEARANCE.code} />
  <p>The <code>match</code> call became the object lookup from the run:</p>
  <DocsCode label={PINNED_SCHEME.label} code={PINNED_SCHEME.code} />
  <p>
    <code>theme-boot.js</code> still imports nothing but the appearance script, now with the
    <code>.js</code> extension a browser needs:
  </p>
  <DocsCode label={THEME_BOOT_IMPORTS.label} code={THEME_BOOT_IMPORTS.code} />
  <p>
    The script it builds is the same, byte for byte, so the copy in Dokseo's <code>app.html</code>
    and the hash that admits it did not change.
  </p>
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.icons}>
  <p>
    Kandan has {ICON_COUNT} icons, all from Lucide. Each is a Svelte file that hands its SVG elements
    to a shared <code>Icon.svelte</code>:
  </p>
  <DocsCode label={CHECK_ICON.label} code={CHECK_ICON.code} />
  <DocsCode label={ICON_SVG.label} code={ICON_SVG.code} />
  <p>
    Those elements are data inside Svelte files, so a page without Svelte cannot use them. In the
    core, each icon is now an <code>.svg</code> file in <code>core/icons/</code> holding the same
    elements, and a script in kandan-ui-svelte writes the Svelte files from them; a spec fails when
    a committed icon differs from what the script writes. Lucide's license is ISC (MIT for the icons
    that came from Feather), on the condition that its copyright notice and permission notice appear
    in all copies, so the license file Kandan kept beside its icons moved to
    <code>core/icons/LICENSE.txt</code> with the SVG files.
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
    <code>kandan-ui-vanilla</code> needs the same computation in plain JavaScript, or a page writes
    that markup by hand. The other {scripted}:
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
    These are the components that have rules beside their fixtures (<a
      href={kandanCoreHref('rules')}>Behavior the markup cannot hold</a
    >), one rule file each, and that will need a behavior module in <code>kandan-ui-vanilla</code>.
  </p>
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.specs}>
  <p>
    The specs split the same way as the files they check. The stylesheet spec was the clearest case:
    it read only CSS, yet it imported two TypeScript files from <code>components/</code>, the
    narrow-screen query from <code>breakpoints.ts</code> and the tag colors from
    <code>classes.ts</code>. Both moved with it, and in the core it imports them as its neighbors:
  </p>
  <DocsCode label={DESIGN_SPEC_IMPORTS.label} code={DESIGN_SPEC_IMPORTS.code} />
  <p>
    The spec for the contract itself was less new than it sounded. {SERVER_RENDER_SPEC_COUNT} spec files
    in <code>components/</code> already rendered components to a string with
    <code>render</code> from <code>svelte/server</code>, in Node, in the same unit project as every
    other spec. The contract spec uses the same call for each of the core's {FIXTURE_COUNT} fixtures and
    compares the whole string with the fixture instead of picking out one attribute.
  </p>
</DocsSection>
