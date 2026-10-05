<script lang="ts">
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { SPLIT_SQUASH_JOIN } from './extraction-runs';
  import { RELEASES_MERGE_HREF, VENDORED_SECTIONS, vendoredHref } from './vendored-sections';

  const REMOTE = `git remote add kandan https://github.com/jerhage/kandan-ui-svelte`;

  const UPDATE = `git switch main
git subtree pull --prefix=src/lib/ui kandan main --squash`;

  const SEND_BACK = `git subtree push --prefix=src/lib/ui kandan main`;

  const COUNT_FIRST = `git subtree split --prefix=src/lib/ui
git rev-list --count <the commit it printed>`;

  const LAND = `git switch main
git merge --ff-only <branch>`;
</script>

<DocsSection title={VENDORED_SECTIONS.update}>
  <p>
    The library's repository is a remote of Dokseo's, added once under the name
    <code>kandan</code>:
  </p>
  <DocsCode label="Name the library's repository once" code={REMOTE} />
  <p>
    An update is one <code>pull</code>, run on <code>main</code> directly, without a branch or a pull
    request:
  </p>
  <DocsCode label="Take the library's main into src/lib/ui" code={UPDATE} />
  <p>
    It adds the pair every squashed pull adds: one squash commit holding the library's files at the
    new version, and one merge commit joining it to Dokseo (<a href={vendoredHref('squash')}
      >What --squash leaves in the history</a
    >). These merges, one per update and one for the first add, are the only merge commits Dokseo's
    <code>main</code> accepts; every other change lands without one (<a href={RELEASES_MERGE_HREF}
      >Merge strategies</a
    >). A local edit to the library that conflicts with the update stops the merge, and I resolve it
    like any other conflict (<a href={vendoredHref('conflict')}>When a local edit conflicts</a>).
  </p>
</DocsSection>

<DocsSection title={VENDORED_SECTIONS.sendBack}>
  <p>
    A fix to the library made in Dokseo is an ordinary commit on an ordinary branch, reviewed like
    any other change. Once it is on <code>main</code>, <code>push</code> splits the library's part
    of Dokseo's history and pushes it to the library's <code>main</code>:
  </p>
  <DocsCode label="Send Dokseo's library commits to kandan-ui-svelte" code={SEND_BACK} />
  <p>
    Only commits that touched <code>src/lib/ui/</code> travel, with the folder as the root and their
    messages as written. If the library's <code>main</code> holds commits Dokseo has not pulled yet,
    the push is refused as a non-fast-forward, and a <code>pull</code> comes first.
  </p>
  <p>
    Before a push, I count what the split would publish. The split prints one commit id, and
    <code>git rev-list --count</code> on it gives the number of commits the library's history would hold:
  </p>
  <DocsCode label="Count a split before pushing it" code={COUNT_FIRST} />
  <p>
    At the time of writing the answer is 13: the library's first ten commits and three made since. A
    number in the thousands means Dokseo's own history is about to go out with it, which happened
    once while the library was being extracted (<a href={vendoredHref('stray')}
      >The commit that pulled in all of Dokseo</a
    >).
  </p>
</DocsSection>

<DocsSection title={VENDORED_SECTIONS.rules}>
  <p>
    git subtree finds everything it needs in Dokseo's history: the squash commits name the library
    commit they hold, and every split rebuilds the library's commits from Dokseo's. So the history
    around <code>src/lib/ui/</code> follows a few rules.
  </p>
  <p>
    A branch that holds a subtree merge is never rebased. A rebase drops the merge and replays the
    squash commit at the root of the repository, as the scratch run showed (<a
      href={vendoredHref('squash')}>What --squash leaves in the history</a
    >). Such a branch lands on <code>main</code> with a fast-forward, which moves
    <code>main</code> to the branch's last commit and rewrites nothing:
  </p>
  <DocsCode label="Land a branch that holds a subtree merge" code={LAND} />
  <p>GitHub's "Rebase and merge" is a rebase, so it is not used for such a branch.</p>
  <p>
    The library's first ten commits in Dokseo's history, from the move into
    <code>src/lib/ui/</code> to the README, are never rewritten. A split of Dokseo rebuilds them
    into exactly the commits that are the start of kandan-ui-svelte, and that is why the vendoring
    merge disappears from the split: both of its parents become the same library commit. If any of
    the ten changed, a split would build a second copy of the library's start beside the published
    one, and a push would no longer fit onto the library's <code>main</code>.
  </p>
  <p>
    Each split walks Dokseo's whole history, over 1,200 commits, and takes about 45 seconds on my
    machine. A squash commit does not mark a point where the walk could stop: git-subtree records it
    as a mapping and keeps walking.
  </p>
  <DocsCode label={SPLIT_SQUASH_JOIN.label} code={SPLIT_SQUASH_JOIN.code} />
  <p>
    Only a join made with <code>--rejoin</code> cuts the walk short, and a <code>--rejoin</code>
    without <code>--squash</code> merges the library's own commits into Dokseo's history. I accept the
    45 seconds instead.
  </p>
</DocsSection>
