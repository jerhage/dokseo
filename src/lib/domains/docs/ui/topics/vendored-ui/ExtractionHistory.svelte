<script lang="ts">
  import StepItem from '$lib/ui/components/StepItem.svelte';
  import StepList from '$lib/ui/components/StepList.svelte';
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import {
    AFTER_REWRITE,
    BEFORE_REWRITE,
    BLOATED_SPLIT,
    CLEAN_SPLIT,
    FIRST_SPLIT,
    REAL_ADD,
    REWRITE_COMMANDS,
    SPLIT_COPIES_MERGE,
    SPLIT_KEEPS_NO_TREE,
    SQUASH_COMMIT_MESSAGE,
  } from './extraction-runs';
  import { ADD_EXISTING, REVENDOR_HISTORY } from './subtree-runs';
  import { VENDORED_SECTIONS, vendoredHref } from './vendored-sections';

  const REJECTED = [
    {
      fix: 'split --onto',
      does: 'Tries to connect the split to an existing history.',
      why: 'The removal commit still maps to itself, so it stays in the split.',
    },
    {
      fix: 'split --ignore-joins',
      does: 'Ignores earlier --rejoin commits and walks the whole history.',
      why: 'The walk still meets the removal commit.',
    },
    {
      fix: 'split --rejoin',
      does: 'Merges the split back into Dokseo, so later splits start from that join.',
      why: 'The split it joins already holds the removal commit, and without --squash the join merges library commits into Dokseo.',
    },
    {
      fix: 'A permanent replace ref',
      does: 'git replace --graft on its own makes every local command see the merge with the right parents.',
      why: 'Replace refs stay local. Every clone that splits would need the same ref, set up by hand.',
    },
    {
      fix: 'format-patch --relative, then git am',
      does: 'Exports the three new commits with paths relative to the folder and applies them in the library repository.',
      why: 'It works once. Every later split would stay bloated, so every later fix would need the same detour.',
    },
  ] as const;
</script>

<DocsSection title={VENDORED_SECTIONS.splitRun}>
  <p>
    With the folder standing on its own, <code>git subtree split --prefix=src/lib/ui</code> built the
    library's history out of Dokseo's. It held ten commits, from the move to the README:
  </p>
  <DocsCode label={FIRST_SPLIT.label} code={FIRST_SPLIT.code} />
  <p>
    Each one has the folder's files at its root and the message of the Dokseo commit it came from,
    Dokseo's wording included. I created kandan-ui-svelte on GitHub and pushed that history to its
    <code>main</code>.
  </p>
</DocsSection>

<DocsSection title={VENDORED_SECTIONS.revendor}>
  <p>
    Dokseo still held the library as plain folder contents, not as a vendored copy: no squash commit
    recorded which library version it was. To use the library the way another app does, Dokseo had
    to vendor it from the new repository. <code>add</code> refuses a prefix that exists, as a scratch
    run had shown:
  </p>
  <DocsCode label={ADD_EXISTING.label} code={ADD_EXISTING.code} />
  <p>
    So, as in the scratch run, the folder is removed in one commit and added back in the next. In
    the scratch app the files after the add were identical to those before the removal (<code
      >git diff</code
    > between the two commits printed nothing), and the history read:
  </p>
  <DocsCode label={REVENDOR_HISTORY.label} code={REVENDOR_HISTORY.code} />
  <p>I did the same in Dokseo: one commit removed <code>src/lib/ui/</code>, then:</p>
  <DocsCode label={REAL_ADD.label} code={REAL_ADD.code} />
  <DocsCode label={SQUASH_COMMIT_MESSAGE.label} code={SQUASH_COMMIT_MESSAGE.code} />
  <p>
    The tree after the add was identical to the tree before the removal. I reworded the merge's
    message to Dokseo's commit conventions. That is safe, because git subtree reads its
    <code>git-subtree-dir</code> and <code>git-subtree-split</code> lines from the squash commit, and
    the merge has none. The branch then read:
  </p>
  <DocsCode label={BEFORE_REWRITE.label} code={BEFORE_REWRITE.code} />
</DocsSection>

<DocsSection title={VENDORED_SECTIONS.stray}>
  <p>
    Next, the library got its own tooling in three more commits, and those had to go back to
    kandan-ui-svelte with <code>git subtree push</code>. A split of the branch, run on its own
    before any push, held 1,245 commits:
  </p>
  <DocsCode label={BLOATED_SPLIT.label} code={BLOATED_SPLIT.code} />
  <p>
    The ten library commits were there, rebuilt exactly, ending at <code>ba9af91b</code>, the commit
    the repository already had. So was the removal commit, unchanged, with Dokseo's whole tree and
    all 1,230 commits before it. A push would have published Dokseo's source and history into the
    library's repository. The split walks Dokseo's history from the oldest commit:
  </p>
  <StepList>
    <StepItem title="Before the move">
      A commit without <code>src/lib/ui/</code> whose parents map to nothing is left out.
    </StepItem>
    <StepItem title="From the move to the README">
      Each commit maps to a library commit. The last of them, the commit before the removal, maps to
      <code>ba9af91b</code>.
    </StepItem>
    <StepItem title="The removal commit">
      It has no <code>src/lib/ui/</code>, but its parent maps to a library commit, so git-subtree
      maps it to itself.
    </StepItem>
    <StepItem title="The vendoring merge">
      Its squash parent maps to <code>ba9af91b</code> through its <code>git-subtree-split</code>
      line, and its other parent maps to the removal commit. That parent has history the library commit
      lacks, so the merge is kept with both parents.
    </StepItem>
  </StepList>
  <p>The third step is this branch of git-subtree's split:</p>
  <DocsCode label={SPLIT_KEEPS_NO_TREE.label} code={SPLIT_KEEPS_NO_TREE.code} />
  <p>
    and the fourth is the end of the function that decides whether a commit can be skipped in favor
    of an identical parent:
  </p>
  <DocsCode label={SPLIT_COPIES_MERGE.label} code={SPLIT_COPIES_MERGE.code} />
  <p>
    <code>$identical</code> was <code>ba9af91b</code>, whose tree equals the merge's library tree.
    <code>$nonidentical</code> was the removal commit, and
    <code>git rev-list --count ba9af91b..fa95c98b</code> is 1,231, so the merge was copied. The add itself
    was fine; the commit before it was the problem.
  </p>
</DocsSection>

<DocsSection title={VENDORED_SECTIONS.rewrite}>
  <p>
    Nothing after the first ten commits had been pushed anywhere, so the branch could still be
    rewritten. The fix was to give the vendoring merge the last commit that still had the folder as
    its first parent, in place of the removal commit. The merge's tree stays the same, because the
    add put the folder back exactly as it was, and the removal commit drops out of the history.
  </p>
  <p>
    I kept a backup branch, then ran three commands. <code>git replace --graft</code> makes git
    treat the merge as if its parents were the two given commits. <code>git filter-branch</code>
    over the commits after the last good one rewrites each of them, which turns the grafted parents into
    real ones. Deleting the replace ref leaves ordinary commits:
  </p>
  <DocsCode label={REWRITE_COMMANDS.label} code={REWRITE_COMMANDS.code} />
  <DocsCode label={AFTER_REWRITE.label} code={AFTER_REWRITE.code} />
  <p>
    Every commit after the merge got a new id, and the tree at the tip of the branch was the same
    object before and after. A split now holds 13 commits in one line, with no merge:
  </p>
  <DocsCode label={CLEAN_SPLIT.label} code={CLEAN_SPLIT.code} />
  <p>
    The merge drops out because both of its parents now map to the same commit. The commit before it
    rebuilds <code>ba9af91b</code> exactly from the ten library commits, and the squash commit names
    <code>ba9af91b</code> in its <code>git-subtree-split</code> line. With one parent whose library
    tree equals its own, the merge is skipped, and the three tooling commits follow
    <code>ba9af91b</code> directly. Both splits, before and after, took about 45 seconds.
  </p>
</DocsSection>

<DocsSection title={VENDORED_SECTIONS.rejected}>
  <p>
    Rewriting a history is a big step, and git subtree and git offer other routes. None of them
    takes the removal commit out of a split:
  </p>
  <Table size="sm" caption="Fixes considered for the bloated split">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Fix</TableHeaderCell>
        <TableHeaderCell>What it does</TableHeaderCell>
        <TableHeaderCell>Why not</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each REJECTED as row (row.fix)}
        <TableRow>
          <TableHeaderCell scope="row"><code>{row.fix}</code></TableHeaderCell>
          <TableCell>{row.does}</TableCell>
          <TableCell>{row.why}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
</DocsSection>

<DocsSection title={VENDORED_SECTIONS.lesson}>
  <p>
    Extracting a folder into a library with git subtree comes down to a few things I would do the
    same way again:
  </p>
  <ul class="col gap-2">
    <li>
      Move the library into one folder first, with relative imports only, its own assets, specs that
      read only the folder, and its guide inside it. The library's history starts at that move.
    </li>
    <li>
      Split, push the result as the new repository's <code>main</code>, and vendor it back into the
      app with <code>add --squash</code>, so the app uses the library like any other.
    </li>
  </ul>
  <p>And one thing I would do differently:</p>
  <ul class="col gap-2">
    <li>
      The merge that <code>add</code> makes must have, as its first parent, a commit that still holds
      the folder. A removal commit between them keeps the app's whole history in every split. If one gets
      there anyway, fix the branch before anything is pushed: graft the merge onto the commit before the
      removal and rewrite the commits after it.
    </li>
  </ul>
  <p>
    The rule I keep from it: count a split before pushing it (<a href={vendoredHref('sendBack')}
      >Sending a fix back to Kandan UI</a
    >). The count is one command, and it is the difference between pushing three commits and pushing
    an app.
  </p>
</DocsSection>
