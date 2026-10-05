<script lang="ts">
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { COPY_MANIFEST, LOCAL_EDIT_HASH } from './subtree-runs';
  import { VENDORED_PLAN_SECTIONS, vendoredPlanHref } from './vendored-sections';

  const FILE_STATES = [
    {
      state: 'Hash equals the manifest',
      meaning: 'Untouched since the last copy.',
      update: 'Overwrite with the new version.',
    },
    {
      state: 'Hash differs from the manifest',
      meaning: 'Edited in the app.',
      update:
        'Show the local change first, then merge it with the new version or keep one of the two.',
    },
    {
      state: 'Listed, but missing',
      meaning: 'Deleted in the app.',
      update: 'Ask before bringing it back.',
    },
    {
      state: 'In the new version only',
      meaning: 'Added by the library.',
      update: 'Copy it in.',
    },
  ] as const;

  const COMPARISON = [
    {
      point: 'Something to write',
      subtree: "Nothing. The command is part of git's source, in contrib.",
      copy: 'The tool, its tests, and its upkeep in every app.',
    },
    {
      point: 'Merge commits',
      subtree: 'One per add and per update.',
      copy: 'None. An update is an ordinary commit.',
    },
    {
      point: 'Local edits on update',
      subtree: "git's three-way merge, with conflicts marked in the file.",
      copy: 'Whatever the tool implements: a warning, or a merge it runs itself.',
    },
    {
      point: 'A subset of the library',
      subtree: 'No. The prefix holds the whole library.',
      copy: 'Yes. The tool can copy only the components an app uses.',
    },
    {
      point: 'A fix back to the library',
      subtree: 'push, with the app commit and its message.',
      copy: 'By hand: copy the file into the library repository and commit there.',
    },
    {
      point: 'Extracting from Dokseo',
      subtree: 'split, keeping the history from the folder on.',
      copy: 'A plain copy, without history.',
    },
  ] as const;
</script>

<DocsSection title={VENDORED_PLAN_SECTIONS.copyTool}>
  <p>
    shadcn/ui shares components another way. Its documentation says of it: "This is not a component
    library. It is how you build your component library." A command-line tool copies a component's
    source into the project instead of installing a package, and the project owns the copy from then
    on.
  </p>
  <p>
    A copy tool for this library would be a script in each app. It reads a tagged version of the
    library repository, copies its files into <code>src/lib/ui/</code>, and writes a manifest next
    to them: the version, and a hash of every file as it was copied. With the two files of the
    scratch library at
    <code>v1.0.0</code>, the manifest would read:
  </p>
  <DocsCode label={COPY_MANIFEST.label} code={COPY_MANIFEST.code} />
  <p>
    The manifest is what makes an update safe. On the next run the tool hashes each file again and
    compares. After app A's explicit type fix, <code>Button.svelte</code> hashes differently:
  </p>
  <DocsCode label={LOCAL_EDIT_HASH.label} code={LOCAL_EDIT_HASH.code} />
  <p>
    so the tool can tell that the file was edited in the app and stop before overwriting it. Every
    file falls in one of these cases:
  </p>
  <Table size="sm" caption="What a copy tool does with each file on an update">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>File</TableHeaderCell>
        <TableHeaderCell>Meaning</TableHeaderCell>
        <TableHeaderCell>On update</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each FILE_STATES as row (row.state)}
        <TableRow>
          <TableHeaderCell scope="row">{row.state}</TableHeaderCell>
          <TableCell>{row.meaning}</TableCell>
          <TableCell>{row.update}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
</DocsSection>

<DocsSection title={VENDORED_PLAN_SECTIONS.copyCost}>
  <p>
    None of that exists yet. The tool would have to fetch a tag of the library repository, hash
    files, read and write the manifest, list the four cases before changing anything, and merge an
    edited file with the new version. git can do the last part for one file: <code
      >git merge-file</code
    >
    runs the same three-way merge as a <code>pull</code>, given the edited file, the version the
    manifest recorded and the new version. The tool would also need its own tests, and a copy of it
    in every app, which is one more thing to keep in step.
  </p>
  <Table size="sm" caption="git subtree and a copy tool">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Point</TableHeaderCell>
        <TableHeaderCell>git subtree</TableHeaderCell>
        <TableHeaderCell>Copy tool</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each COMPARISON as row (row.point)}
        <TableRow>
          <TableHeaderCell scope="row">{row.point}</TableHeaderCell>
          <TableCell>{row.subtree}</TableCell>
          <TableCell>{row.copy}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
</DocsSection>

<DocsSection title={VENDORED_PLAN_SECTIONS.decision}>
  <p>
    I chose <code>git subtree</code>. It has nothing to write or maintain. Local edits merge with
    the same three-way merge as any branch, and a conflict looks like any other conflict. A fix made
    in an app goes back with <code>push</code> as a real commit with its message, so the library
    keeps the reason for each change. And <code>split</code> extracts the library from Dokseo, where it
    was built, with its history from the folder on.
  </p>
  <p>
    The price is the merge commits: one when an app adds the library, and one per update (<a
      href={vendoredPlanHref('squash')}>What --squash leaves in the history</a
    >). I accept them for this folder only. The copy tool stays documented here as the alternative,
    for an app that needs only part of the library or a history without merges.
  </p>
</DocsSection>
