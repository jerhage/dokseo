<script lang="ts">
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { ADD_TREE, SUBMODULE_TREE } from './subtree-runs';
  import {
    UI_LIBRARY_PLAYGROUND_HREF,
    VENDORED_PLAN_SECTIONS,
    vendoredPlanHref,
  } from './vendored-sections';

  const COMPARISON = [
    {
      aspect: 'Where the code lives',
      published:
        'In node_modules, which is not committed. package.json and the lockfile name the version.',
      vendored: 'In a folder of the app, committed like any other file.',
    },
    {
      aspect: 'A fresh clone',
      published: 'Needs an install that fetches the package from the registry.',
      vendored: 'Has the code already.',
    },
    {
      aspect: 'Taking a new version',
      published: 'Change the version range and install again.',
      vendored: 'An explicit merge or copy, reviewed and committed in the app.',
    },
    {
      aspect: 'Changing the library for one app',
      published: 'Fork the package, or patch the installed files after every install.',
      vendored: 'Edit the file and commit.',
    },
    {
      aspect: 'Drift',
      published: 'Every app runs the published code of its version.',
      vendored:
        'Each copy can drift from the library, and an update can conflict with a local edit.',
    },
    {
      aspect: 'Publishing',
      published: 'A registry account, a build step and a version per release.',
      vendored: 'A git repository the apps can fetch from, and tags.',
    },
  ] as const;

  const WAYS = [
    {
      way: 'git submodule',
      files: 'In a second repository. The app records only a commit id.',
      update: 'Move the recorded commit.',
    },
    {
      way: 'git subtree',
      files: 'In the app, as ordinary files and commits.',
      update: 'A merge of the newer library version into the folder.',
    },
    {
      way: 'A copy tool',
      files: 'In the app, as ordinary files, plus a manifest.',
      update: 'The tool copies the newer version over, file by file.',
    },
  ] as const;
</script>

<DocsSection title={VENDORED_PLAN_SECTIONS.vendoring}>
  <p>
    An npm package reaches an app through a registry. The app's <code>package.json</code> names the
    package and a version range, the lockfile pins the exact version, and an install downloads the
    published files into <code>node_modules</code>. That folder is not committed: every clone runs
    an install to get it back, and the code inside is whatever was published for that version.
  </p>
  <p>
    Vendoring a dependency means copying its source into the app's own repository and committing it
    there, for example to a folder <code>src/lib/ui/</code>. From then on the library's files are
    ordinary files of the app. A clone has them, a search finds them, the app's build compiles them
    like its own code, and a change to one of them is a commit in the app.
  </p>
</DocsSection>

<DocsSection title={VENDORED_PLAN_SECTIONS.why}>
  <p>
    Dokseo's UI library is its base components, its layered stylesheets with their design tokens and
    themes, and its fonts (<a href={UI_LIBRARY_PLAYGROUND_HREF}>The playground</a> shows every
    piece). I want to use it in other Svelte projects too, and in each of them I want the full
    source in the repository, editable where it is used, with no <code>node_modules</code> entry and no
    registry package.
  </p>
  <p>
    The reason is how a UI library is used. An app changes its components more often than almost any
    other dependency: a missing size on a button, a focus ring that disappears on one theme, a
    dialog that needs one more slot. With a published package, each of those is a change in the
    library's repository, a release, a version bump in the app and an install, before the app can
    even try it. With a vendored copy, the change is made in the app, tried in the app, and sent
    back to the library once it works.
  </p>
</DocsSection>

<DocsSection title={VENDORED_PLAN_SECTIONS.tradeoffs}>
  <Table size="sm" caption="A published package and a vendored copy">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Aspect</TableHeaderCell>
        <TableHeaderCell>Published package</TableHeaderCell>
        <TableHeaderCell>Vendored copy</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each COMPARISON as row (row.aspect)}
        <TableRow>
          <TableHeaderCell scope="row">{row.aspect}</TableHeaderCell>
          <TableCell>{row.published}</TableCell>
          <TableCell>{row.vendored}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    The cost of vendoring is in the update and drift rows. An update is no longer a version number:
    it is a merge of the library's changes into a folder the app may have edited. Two apps that edit
    their copies differently end up with two different libraries unless the edits go back to the
    library. A vendoring method is mostly a way to keep those two costs small.
  </p>
</DocsSection>

<DocsSection title={VENDORED_PLAN_SECTIONS.ways}>
  <Table size="sm" caption="Ways to put a library's source in an app repository">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Way</TableHeaderCell>
        <TableHeaderCell>Where the files are</TableHeaderCell>
        <TableHeaderCell>An update</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each WAYS as row (row.way)}
        <TableRow>
          <TableHeaderCell scope="row">{row.way}</TableHeaderCell>
          <TableCell>{row.files}</TableCell>
          <TableCell>{row.update}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    The next sections take them in that order: why a submodule does not count, how
    <code>git subtree</code> works command by command, and what a copy tool would be (<a
      href={vendoredPlanHref('copyTool')}>A copy tool with a manifest</a
    >).
  </p>
</DocsSection>

<DocsSection title={VENDORED_PLAN_SECTIONS.submodule}>
  <p>
    A git submodule puts one repository inside another. <code>git submodule add</code> clones the
    library into the folder and records two things in the app: a <code>.gitmodules</code> file with the
    library's URL, and a tree entry for the folder that holds a commit id instead of files. I added the
    same library to a scratch app both ways. With a submodule, the app's tree is:
  </p>
  <DocsCode label={SUBMODULE_TREE.label} code={SUBMODULE_TREE.code} />
  <p>
    Mode <code>160000</code> with type <code>commit</code> is a gitlink: the whole library is one
    pointer to commit <code>3843b93</code> of another repository. Vendored with
    <code>git subtree</code>, the same library is ordinary blobs in the app's own tree:
  </p>
  <DocsCode label={ADD_TREE.label} code={ADD_TREE.code} />
  <p>
    The difference shows on a fresh clone. I cloned the submodule app with a plain
    <code>git clone</code>, and its <code>src/lib/ui</code> folder was empty: the files come from
    the library's own URL, through <code>git submodule update --init</code> or a clone with
    <code>--recurse-submodules</code>. An edit to the library is a commit in the library's
    repository, followed by a commit in the app that moves the pointer. The source is never part of
    the app's history, so a submodule is a link to the library, not a vendored copy of it.
  </p>
</DocsSection>
