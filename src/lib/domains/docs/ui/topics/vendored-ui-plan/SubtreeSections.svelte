<script lang="ts">
  import Diagram from '$lib/ui/components/Diagram.svelte';
  import Figure from '$lib/ui/components/Figure.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import {
    ADD_COMMAND,
    ADD_HISTORY,
    ADD_SQUASH_MESSAGE,
    AFTER_PULL,
    AFTER_PUSH,
    BEFORE_PULL,
    CONFLICT_FILE,
    CONFLICT_OUTPUT,
    MERGED_BUTTON,
    NO_SQUASH_HISTORY,
    PULL_COMMAND,
    PULL_OUTPUT,
    PULL_REFUSALS,
    PULL_SQUASH_MESSAGE,
    PUSHED_FIX,
    PUSH_COMMAND,
    REBASED_PULL,
    SPLIT_AFTER_MOVE,
    SPLIT_COMMAND,
    SPLIT_HISTORY,
    SPLIT_SOURCE,
  } from './subtree-runs';
  import { SQUASH_PULL_HISTORY, VENDORING_FLOW } from './vendored-diagrams';
  import {
    RELEASES_MERGE_HREF,
    VENDORED_PLAN_SECTIONS,
    vendoredPlanHref,
  } from './vendored-sections';
</script>

<DocsSection title={VENDORED_PLAN_SECTIONS.subtree}>
  <p>
    <code>git subtree</code> is a shell script in git's <code>contrib/subtree</code> folder, so
    whether an installation has it depends on who packaged git. The Homebrew build of Git 2.46.1
    that I used installs the command but no manual page; the reference is
    <code>git-subtree.txt</code>
    in the same folder of git's source. It describes the command this way: "Subtrees allow subprojects
    to be included within a subdirectory of the main project, optionally including the subproject's entire
    history." And, against submodules: "subtrees do not need any special constructions (like
    <code>.gitmodules</code> files or gitlinks) be present in your repository".
  </p>
  <Figure>
    <Diagram {...VENDORING_FLOW} />
    {#snippet caption()}
      One library repository and two apps. <code>add</code> and <code>pull</code> bring a version
      in,
      <code>push</code> sends an app's library changes to a branch, and the library merges it.
    {/snippet}
  </Figure>
  <p>
    Every command takes <code>--prefix</code>, the folder in the app that holds the library; the
    documentation calls it mandatory for all commands. git subtree keeps no configuration file. It
    records what it vendored in commit messages, as two lines, <code>git-subtree-dir</code> and
    <code>git-subtree-split</code>, and finds them again by searching the log for
    <code>git-subtree-dir: &lt;prefix&gt;</code>.
  </p>
  <p>
    To show what each command does to a history, I ran them in scratch repositories: a library
    <code>ui-lib</code> with a <code>Button.svelte</code> and a <code>tokens.css</code>, tagged
    <code>v1.0.0</code>, <code>v1.1.0</code> and <code>v1.2.0</code> as it grew, and small apps that
    vendor it at <code>src/lib/ui</code>. The output below is from that run, with the library path
    written as <code>../ui-lib</code>.
  </p>
</DocsSection>

<DocsSection title={VENDORED_PLAN_SECTIONS.add}>
  <p>
    <code>add</code> fetches a commit of the library and creates the folder. In app A, whose only
    commit so far was <code>chore: start app A</code>:
  </p>
  <DocsCode label={ADD_COMMAND.label} code={ADD_COMMAND.code} />
  <DocsCode label={ADD_HISTORY.label} code={ADD_HISTORY.code} />
  <p>
    With <code>--squash</code>, <code>add</code> made two commits. The first, <code>ba921a0</code>,
    has no parent: it holds the library's files as they were at tag <code>v1.0.0</code>, library
    commit <code>c71a4fc</code>. Its message carries the two lines git subtree reads back later:
  </p>
  <DocsCode label={ADD_SQUASH_MESSAGE.label} code={ADD_SQUASH_MESSAGE.code} />
  <p>
    The second, <code>501aa03</code>, is a merge of that commit into the app's history, with the
    files placed under the prefix. After it, <code>src/lib/ui/components/Button.svelte</code> is an ordinary
    file of app A.
  </p>
  <p>
    Without <code>--squash</code>, the merge brings the library's own history along. App B added the
    library at <code>v1.2.0</code> that way, and every commit the library ever had became part of app
    B's log:
  </p>
  <DocsCode label={NO_SQUASH_HISTORY.label} code={NO_SQUASH_HISTORY.code} />
</DocsSection>

<DocsSection title={VENDORED_PLAN_SECTIONS.squash}>
  <p>
    The documentation describes <code>--squash</code> as producing "only a single commit that
    contains all the differences you want to merge", and gives the reason: "People rarely want to
    see every change that happened between v1.0 and v1.1 of the library they're using, since none of
    the interim versions were ever included in their application." Each later
    <code>pull --squash</code>
    adds the same pair as <code>add</code> did: one squash commit, then one merge. This is app A's
    history before and after taking <code>v1.1.0</code>:
  </p>
  <DocsCode label={BEFORE_PULL.label} code={BEFORE_PULL.code} />
  <DocsCode label={AFTER_PULL.label} code={AFTER_PULL.code} />
  <Figure>
    <Diagram {...SQUASH_PULL_HISTORY} />
    {#snippet caption()}
      The same history, oldest first. The pull added the two highlighted commits: a squash commit
      whose parent is the previous squash commit, and a merge joining it to the app. Commit messages
      shortened.
    {/snippet}
  </Figure>
  <p>
    The second squash commit's parent is the first squash commit, not anything in the app, so the
    squash commits form their own short line of library versions beside the app's commits. Its
    message lists the library commits it stands for:
  </p>
  <DocsCode label={PULL_SQUASH_MESSAGE.label} code={PULL_SQUASH_MESSAGE.code} />
  <p>
    The merge commit is the cost. I keep Dokseo's <code>main</code> free of merge commits (<a
      href={RELEASES_MERGE_HREF}>Merge strategies</a
    >), and git subtree cannot avoid one: the script merges with <code>git merge --no-ff</code>, so
    even an update with no local edits ends in a merge. I accept that cost for vendoring: one merge
    per library update, each named by its message.
  </p>
  <p>
    A merge also has to stay a merge. I put a pull on a branch, moved the branch's base on, and ran
    a plain <code>git rebase</code>. The rebase dropped the merge and replayed the squash commit on
    its own, at the repository root instead of under <code>src/lib/ui</code>:
  </p>
  <DocsCode label={REBASED_PULL.label} code={REBASED_PULL.code} />
  <p>
    GitHub's "Rebase and merge" adds a pull request's commits "onto the base branch individually
    without a merge commit", so a library update cannot reach <code>main</code> that way. I run
    <code>git subtree pull</code> on <code>main</code> directly, without a pull request, and accept its
    merge commit for library updates only.
  </p>
</DocsSection>

<DocsSection title={VENDORED_PLAN_SECTIONS.pull}>
  <p>
    Before taking <code>v1.1.0</code>, app A had edited its copy: commit <code>054d890</code> gave
    the button an explicit <code>type="button"</code> on line 5 of <code>Button.svelte</code>. The
    library meanwhile changed line 2 of the same file and added a token.
  </p>
  <DocsCode label={PULL_COMMAND.label} code={PULL_COMMAND.code} />
  <DocsCode label={PULL_OUTPUT.label} code={PULL_OUTPUT.code} />
  <p>
    <code>pull</code> fetches the ref and builds a new squash commit that holds the library's files at
    the new version, with the previous squash commit as its parent. Then it merges that commit. That merge
    is git's ordinary three-way merge: the base is the last vendored version, one side is the app's folder
    with its edits, the other is the new library version. Changes on different lines of a file both survive:
  </p>
  <DocsCode label={MERGED_BUTTON.label} code={MERGED_BUTTON.code} />
  <p>
    The <code>-m</code> option sets the merge commit's message, so an update can follow the app's commit
    conventions. Two cases stop before any merge:
  </p>
  <DocsCode label={PULL_REFUSALS.label} code={PULL_REFUSALS.code} />
</DocsSection>

<DocsSection title={VENDORED_PLAN_SECTIONS.conflict}>
  <p>
    Next, app A let the button be disabled by editing line 5 again, while the library's
    <code>v1.2.0</code> added a variant class to the same line. The pull stopped:
  </p>
  <DocsCode label={CONFLICT_OUTPUT.label} code={CONFLICT_OUTPUT.code} />
  <DocsCode label={CONFLICT_FILE.label} code={CONFLICT_FILE.code} />
  <p>
    <code>HEAD</code> is the app's version, and <code>a9a0089</code> is the new squash commit. This
    is a plain merge conflict, resolved the plain way: I wrote the line with both changes, ran
    <code>git add</code> on the file and <code>git commit --no-edit</code>, which kept the message
    given with <code>-m</code>. The merge commit records the resolution, and the next pull starts
    from it.
  </p>
</DocsSection>

<DocsSection title={VENDORED_PLAN_SECTIONS.push}>
  <p>
    A fix made in an app belongs in the library, or the next app has to make it again.
    <code>push</code> runs <code>split</code> (<a href={vendoredPlanHref('split')}
      >Extracting a library with split</a
    >) on the app's history and pushes the result to a branch of the library repository. I sent app
    A's explicit type fix back to a branch, so the library could review it before merging:
  </p>
  <DocsCode label={PUSH_COMMAND.label} code={PUSH_COMMAND.code} />
  <DocsCode label={AFTER_PUSH.label} code={AFTER_PUSH.code} />
  <DocsCode label={PUSHED_FIX.label} code={PUSHED_FIX.code} />
  <p>
    The fix arrived as its own commit, <code>dfa8634</code>, with the app's message and with the
    path rewritten to the library's root: <code>components/Button.svelte</code>. App A's other
    commit,
    <code>docs: describe app A</code>, touched nothing under the prefix and was left out. The app's
    update merge became a merge in the library whose second parent is the real library commit
    <code>c87f970</code>, because the squash commit had recorded it in
    <code>git-subtree-split</code>. The library's <code>main</code> had not moved since, so
    <code>git merge --ff-only button-type</code>
    in the library moved <code>main</code> onto the branch, and every app gets the fix with its next pull.
  </p>
</DocsSection>

<DocsSection title={VENDORED_PLAN_SECTIONS.split}>
  <p>
    <code>split</code> is the command that turns a folder of one repository into a history of its own.
    The documentation: "The new history includes only the commits (including merges) that affected &lt;prefix&gt;,
    and each of those commits now has the contents of &lt;prefix&gt; at the root of the project instead
    of in a subdirectory." I gave a scratch app a library grown in place:
  </p>
  <DocsCode label={SPLIT_SOURCE.label} code={SPLIT_SOURCE.code} />
  <DocsCode label={SPLIT_COMMAND.label} code={SPLIT_COMMAND.code} />
  <DocsCode label={SPLIT_HISTORY.label} code={SPLIT_HISTORY.code} />
  <p>
    The branch holds the two commits that touched <code>src/lib/ui</code>, with the files at the
    root, and new hashes because their trees changed. A commit that touched the library and the app
    at once keeps its whole message: <code>feat(library): add a shelf with spaced cards</code> is now
    a library commit that only adds a token. The app's commit scopes and wording carry over into the library's
    log.
  </p>
  <p>
    <code>split</code> follows the prefix, not the files. When the library reached
    <code>src/lib/ui</code> by a move, the split history starts at the move:
  </p>
  <DocsCode label={SPLIT_AFTER_MOVE.label} code={SPLIT_AFTER_MOVE.code} />
  <p>
    The two commits before the move are not in it. They stay in the app's history, where
    <code>git log --follow</code> on a single file still finds them. I accept that for Kandan UI:
    its repository's history starts at the move into <code>src/lib/ui/</code>, and the older commits
    stay in Dokseo.
  </p>
</DocsSection>
