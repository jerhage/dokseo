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
    COMPONENTS,
    DOKSEO_FILES_NAMING_CORE_PATHS,
    FIXTURE_COUNT,
    INVENTORY,
    LIBRARY_ROOT,
    PLANNED_DOKSEO_FILE_COUNT,
    RULE_COUNT,
    RULE_FILE_COUNT,
    SERVER_RENDER_SPEC_COUNT,
    UNCERTAIN_RULE_COUNT,
    fateCount,
    fateLabel,
  } from './core-inventory';
  import {
    CORE_LOG,
    DOKSEO_PULL,
    DOKSEO_TREE_AFTER,
    DOKSEO_TREE_BEFORE,
    NODE_TEST_RUN,
    PLAIN_PAGE_RUN,
    POPOVER_RENDER,
    PULL_CONFLICTS,
    SVELTE_HISTORY,
    SVELTE_SPLIT,
  } from './core-runs';
  import { DESIGN_SPEC_IMPORTS } from './core-snippets';
  import {
    KANDAN_CORE_SECTIONS,
    VENDORED_REVENDOR_HREF,
    VENDORED_STRAY_HREF,
    VENDORED_SUBTREE_HREF,
    kandanCoreHref,
  } from './core-sections';

  type Choice = {
    readonly title: string;
    readonly options: string;
    readonly chosen: string;
  };

  const CHOICES: readonly Choice[] = [
    {
      title: 'Fixture format',
      options:
        'One .html file per variant (fixtures/badge/success.html); one file per component with a <template> per variant; or fixture strings in a JavaScript module.',
      chosen:
        'One .html file per variant. A browser reads it as it is, a diff shows one variant, and each contract spec maps the file name to a case.',
    },
    {
      title: 'How the behavior rules are written',
      options:
        'As prose beside each fixture; or as structured data (the state before, the key or event, the state after) in a file next to it.',
      chosen:
        'Structured data, as JSON in rules/. Every framework version runs every rule from the same file, where prose would have to be turned into specs once per version by hand.',
    },
    {
      title: 'Generated ids in a fixture',
      options:
        'Leave components with generated ids out of the contract, or write placeholders in the fixture.',
      chosen:
        'Placeholders, renamed on both sides in order of first appearance, so the spec still checks that the trigger and the sheet name the same id.',
    },
    {
      title: 'Where the normalizer lives',
      options:
        'A copy in each framework version; or in the core beside the fixtures, as test tooling rather than component behavior.',
      chosen:
        'In the core, so every version compares with the same rules. Regular expressions first, and an HTML parser package only when a fixture needs something they cannot read.',
    },
    {
      title: 'Where the Svelte icons are generated',
      options:
        "A script in kandan-ui-svelte that writes components/icons/*.svelte from the core's SVG files; or a build plugin that generates them at build time.",
      chosen:
        'A script whose output is committed, with a spec that fails when a committed icon differs from what the script writes. The folder stays plain files that work at any prefix.',
    },
    {
      title: "The appearance script's language",
      options:
        'Plain JavaScript with JSDoc types, checked with checkJs; or TypeScript with erasable syntax and a build step that writes .js.',
      chosen:
        'Plain JavaScript with JSDoc types. A browser and Node load the same file with no build, and the core checks its types with its own jsconfig.json.',
    },
    {
      title: 'ts-pattern in the core',
      options: 'Keep it as a dependency of the core, or write the one match another way.',
      chosen: 'No runtime dependency in the core: an object lookup.',
    },
    {
      title: "The core's test runner",
      options: "Node's own test runner, or Vitest.",
      chosen:
        'node --test. It needs no package, and the core holds no Svelte files to compile. The browser runs of the rules belong to each framework version.',
    },
    {
      title: 'Versions of the core',
      options: 'The framework versions pull tags, or pull main.',
      chosen:
        'Semantic version tags in kandan-ui. Each framework version pulls a tag and names it in the pull message.',
    },
    {
      title: 'Import paths in apps',
      options:
        'Apps import the core files at their new paths; or the Svelte version keeps modules at the old paths that re-export the core.',
      chosen:
        'The new paths. A re-export module is a second name for the same file, which Dokseo does not allow in its own code.',
    },
    {
      title: 'Order of work',
      options: 'Move Dokseo onto the core first, or start kandan-ui-vanilla first.',
      chosen:
        'Dokseo first, before 1.0. The contract and the Svelte version are what Dokseo runs on; kandan-ui-vanilla has no consumer yet.',
    },
  ];
</script>

<DocsSection title={KANDAN_CORE_SECTIONS.built}>
  <p>
    I planned the core before writing any of it, and tried the riskiest parts in throwaway runs
    first. Then I built it in three steps, each in its own repository: the core itself,
    <code>kandan-ui-svelte</code> moved onto it, and Dokseo pulling the result.
  </p>
</DocsSection>

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

<DocsSection title={KANDAN_CORE_SECTIONS.specs}>
  <p>
    The specs split the same way as the files they check. The stylesheet spec was the clearest case:
    it read only CSS, yet it imported two TypeScript files from <code>components/</code>, the
    narrow-screen query from <code>breakpoints.ts</code> and the tag colors from
    <code>classes.ts</code>. Both moved with it, and in the core it imports them as its neighbors:
  </p>
  <DocsCode label={DESIGN_SPEC_IMPORTS.label} code={DESIGN_SPEC_IMPORTS.code} />
  <p>
    The contract spec was less new than it sounded. {SERVER_RENDER_SPEC_COUNT} spec files in
    <code>components/</code> already rendered components to a string with <code>render</code> from
    <code>svelte/server</code>, in Node, in the same unit project as every other spec. The contract
    spec uses the same call for each of the core's {FIXTURE_COUNT} fixtures and compares the whole string
    with the fixture instead of picking out one attribute.
  </p>
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.phaseCore}>
  <p>
    I started <code>kandan-ui</code> from Dokseo's copy of the library. The stylesheets and the fonts
    moved as they were, the appearance script became plain JavaScript, and each icon became an SVG file
    with Lucide's license beside them.
  </p>
  <p>
    I did not write the fixtures by hand. A throwaway Node script compiled each Svelte component for
    the server through a module hook, rendered every variant with <code>render</code> from
    <code>svelte/server</code>, passed the HTML through <code>fixtureText</code>, and wrote it to
    <code>fixtures/&lt;component&gt;/&lt;variant&gt;.html</code>: {FIXTURE_COUNT} fixtures for all {COMPONENTS.length}
    components. The real fixtures showed what the planned normalizer missed: void elements such as
    <code>img</code>, empty <code>class</code> and <code>style</code> attributes, inline style
    declarations, an id inside an SVG <code>url(#…)</code>, and unquoted values. Each became a step
    of the core's normalizer.
  </p>
  <p>
    The rules came next: {RULE_COUNT} of them in {RULE_FILE_COUNT} files, one file for each component
    whose behavior is more than markup. Each rule names, in its <code>source</code> field, the
    Svelte code it describes. {UNCERTAIN_RULE_COUNT} could not be stated exactly from that code, so they
    are marked not certain, each with a note saying why.
  </p>
  <p>
    Last, the first-paint script. I compared <code>themeBootScript</code>'s output with the old
    TypeScript version's in Node, and the two were the same byte for byte, so Dokseo's
    <code>app.html</code> and the hash in its content security policy did not have to change. The core's
    history at its first tag:
  </p>
  <DocsCode label={CORE_LOG.label} code={CORE_LOG.code} />
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.phaseSvelte}>
  <p>
    In <code>kandan-ui-svelte</code>, the core's files still sat at their old paths, and
    <code>git subtree add</code> refuses a prefix that exists. So, as when Dokseo re-vendored the
    library (<a href={VENDORED_REVENDOR_HREF}>Vendoring the library back into Dokseo</a>), one
    commit removed the files and the next added the core. The removal commit also changed every
    import of a moved file to its path under <code>core/</code>, so the add restored a working
    library. I added the core's first tag with <code>--squash</code> and reworded the merge's
    message to the library's conventions. The squash commit stayed as git subtree wrote it, since
    git subtree reads its <code>git-subtree-dir</code> and <code>git-subtree-split</code> lines from there.
  </p>
  <p>
    Before pushing anything, I checked what a split of <code>core/</code> would hold, because a
    stray commit once pulled all of Dokseo into a split of the library (<a
      href={VENDORED_STRAY_HREF}>The commit that pulled in all of Dokseo</a
    >):
  </p>
  <DocsCode label={SVELTE_SPLIT.label} code={SVELTE_SPLIT.code} />
  <p>
    The split is the core's own last commit, so a push from <code>core/</code> would send the core's
    history and nothing of the library's. Then the library moved onto the core one commit at a time:
    its own tools leave <code>core/</code> to the core's checks, the icon components are generated
    from the core's SVG files, the contract spec renders a case for every fixture, a unit spec
    renders a subject for every fixture a rule starts from, the rules run in a browser project kept
    out of
    <code>verify</code>, CI runs both, and the library got an MIT license:
  </p>
  <DocsCode label={SVELTE_HISTORY.label} code={SVELTE_HISTORY.code} />
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.phaseDokseo}>
  <p>
    Dokseo took all of it with one pull of <code>kandan-ui-svelte</code> on <code>main</code>:
  </p>
  <DocsCode label={DOKSEO_PULL.label} code={DOKSEO_PULL.code} />
  <p>
    The merge stopped with conflicts in ten files, although Dokseo held no edit the library lacked.
    Its <code>src/lib/ui/</code> was exactly the tree of the last library commit it had sent back:
  </p>
  <DocsCode label={DOKSEO_TREE_BEFORE.label} code={DOKSEO_TREE_BEFORE.code} />
  <p>
    Those last commits had reached the library through <code>git subtree push</code> and never come
    back through a pull, so the base of the merge was still the library as Dokseo had first added it
    (<a href={kandanCoreHref('pullAfterPush')}>A pull after a push conflicts</a>). To confirm that,
    I replayed the merge in the library's repository with
    <code>git merge-tree</code>, which merges given commits over a given base without touching any
    working tree. It stopped on the same ten files:
  </p>
  <DocsCode label={PULL_CONFLICTS.label} code={PULL_CONFLICTS.code} />
  <p>
    The replay also shows the case with no conflict. Lucide's license had been added in Dokseo under
    <code>components/icons/</code> and sent back; the library then moved it to
    <code>core/icons/</code>. Only Dokseo's side had ever added the old path, so the merge kept the
    file there with no conflict to mark it.
  </p>
  <p>
    The right result was the library's tree as it stood. I took the library's side for every
    conflict, removed the stray license file, and checked the folder against the pulled commit
    before committing the merge:
  </p>
  <DocsCode label={DOKSEO_TREE_AFTER.label} code={DOKSEO_TREE_AFTER.code} />
  <p>
    The import paths moved to the core in the commits after the merge. The docs pages that quote
    library files then failed their snippet specs, which is what those specs are for, and their
    quotes were taken again from the new files.
  </p>
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.findings}>
  <p>
    The throwaway runs before the build settled several questions, and the build itself corrected
    two of my assumptions.
  </p>
  <p>
    The appearance code had been TypeScript, and <code>pinnedScheme</code> called <code>match</code>
    from ts-pattern. To see how far it was from plain JavaScript, I copied both files out of the repository,
    replaced the <code>match</code> call with an object lookup, and added
    <code>.ts</code> to the import path. Node imported them with no flag and no package, and a spec written
    with Node's own test runner passed:
  </p>
  <DocsCode label={NODE_TEST_RUN.label} code={NODE_TEST_RUN.code} />
  <p>
    The stylesheets had always been built by Vite in Dokseo, so I checked them with no build at all:
    a plain HTML file with <code>data-theme="ember"</code>, the library folder beside it, a link to
    <code>styles/index.css</code>, and some badge, button and accordion markup, served by Python's
    static file server and opened in Chromium:
  </p>
  <DocsCode label={PLAIN_PAGE_RUN.label} code={PLAIN_PAGE_RUN.code} />
  <p>
    Ninety-six stylesheet requests is a lot on a slow connection, so a plain site may still bundle
    them, but the files work without that step.
  </p>
  <p>
    Rendering Kandan's popover twice on the server wrote the same id both times, <code>s1</code>,
    from Svelte's <code>$props.id()</code>. That name belongs to Svelte, which is why fixtures write
    placeholders instead:
  </p>
  <DocsCode label={POPOVER_RENDER.label} code={POPOVER_RENDER.code} />
  <p>
    The nested subtree chain worked as the scratch runs showed (<a href={kandanCoreHref('nested')}
      >A subtree inside a subtree</a
    >), and the one shortcut failed (<a href={kandanCoreHref('shortcut')}
      >No shortcut past kandan-ui-svelte</a
    >).
  </p>
  <p>
    The two corrections. The plan counted {PLANNED_DOKSEO_FILE_COUNT} Dokseo files to change, found by
    searching for <code>styles</code>, <code>fonts</code>, <code>appearance</code> and
    <code>theme-boot</code>; the narrow-screen query and the tag colors moved into the core too, so {DOKSEO_FILES_NAMING_CORE_PATHS.length}
    files changed. And the library's guide had said that sending an app's edit back with
    <code>git subtree push</code> keeps the next pull from conflicting. With <code>--squash</code> it
    does not, as Dokseo's pull showed, and the guide in the library's repository now explains why and
    gives the check.
  </p>
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.choices}>
  <p>
    While planning I wrote down each open question with its options and a recommendation, and every
    one was decided as recommended:
  </p>
  <ol class="stack-md">
    {#each CHOICES as choice (choice.title)}
      <li>
        <p class="m-0"><strong>{choice.title}.</strong> {choice.options}</p>
        <p class="m-0">Chosen: {choice.chosen}</p>
      </li>
    {/each}
  </ol>
</DocsSection>
