<script lang="ts">
  import StepItem from '$lib/ui/components/StepItem.svelte';
  import StepList from '$lib/ui/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { DOKSEO_FILES_NAMING_CORE_PATHS } from './core-inventory';
  import {
    APP_ADD,
    APP_AFTER_ADD,
    APP_AFTER_PULL,
    APP_PULL,
    APP_PUSH,
    CORE_RECEIVES,
    MIDDLE_ADD,
    MIDDLE_AFTER_ADD,
    MIDDLE_PULL,
    MIDDLE_PUSH,
    MIDDLE_RECEIVES,
    ROUND_TRIP,
    SHORTCUT_SPLIT,
  } from './core-runs';
  import { ANY_PREFIX, FONT_FOLDER, LIBRARY_STYLESHEET } from './core-snippets';
  import {
    KANDAN_CORE_SECTIONS,
    VENDORED_IGNORE_HREF,
    VENDORED_PUSH_HREF,
    VENDORED_RULES_HREF,
    VENDORED_SQUASH_HREF,
    kandanCoreHref,
  } from './core-sections';

  const RESOLVE_LABEL = 'Resolving a pull after a push, inside the stopped merge';

  const RESOLVE_STEPS = `git checkout --theirs -- <path>
git add <path>
git diff FETCH_HEAD $(git write-tree --prefix=<prefix>/)`;
</script>

<DocsSection title={KANDAN_CORE_SECTIONS.nested}>
  <p>
    git subtree has no notion of nesting. <code>add</code> copies the files of one commit into a
    folder, and if that commit's repository vendored something itself, those files come along as
    ordinary files. Before building on that, I ran the whole chain in scratch repositories with git
    2.46.1:
    <code>core</code> stands for <code>kandan-ui</code> (a badge stylesheet and its fixture, tagged
    <code>v0.1.0</code>), <code>middle</code> for <code>kandan-ui-svelte</code> (a
    <code>Badge.svelte</code>), and <code>app</code> for Dokseo. <code>kandan-ui-vanilla</code>
    takes the same place as <code>middle</code>, with the same commands, and an app with no
    framework the place of <code>app</code>. Paths are written relative to the repository the
    command runs in.
  </p>
  <DocsCode label={MIDDLE_ADD.label} code={MIDDLE_ADD.code} />
  <DocsCode label={MIDDLE_AFTER_ADD.label} code={MIDDLE_AFTER_ADD.code} />
  <DocsCode label={APP_ADD.label} code={APP_ADD.code} />
  <DocsCode label={APP_AFTER_ADD.label} code={APP_AFTER_ADD.code} />
  <p>
    The app holds the core at <code>src/lib/ui/core/</code> as plain files. Its history has one
    squash commit for <code>src/lib/ui/</code> and nothing about <code>core/</code>: the core's own
    squash commit stays in the middle repository's history.
  </p>
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.updates}>
  <p>
    A change in the core reaches the app in two pulls, in order. The core committed
    <code>fix: give the badge more room</code> and tagged it <code>v0.2.0</code>:
  </p>
  <DocsCode label={MIDDLE_PULL.label} code={MIDDLE_PULL.code} />
  <DocsCode label={APP_PULL.label} code={APP_PULL.code} />
  <DocsCode label={APP_AFTER_PULL.label} code={APP_AFTER_PULL.code} />
  <p>
    Each pull is a merge commit in its repository, as every subtree pull is (<a
      href={VENDORED_RULES_HREF}>Rules for a history with a subtree merge</a
    >). The app's pull took the middle repository's merge of the core along with it, as a change to
    <code>src/lib/ui/core/styles/badge.css</code>.
  </p>
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.fixBack}>
  <p>
    The other direction is two pushes (<a href={VENDORED_PUSH_HREF}>Sending a fix back with push</a
    >). In the app I changed the core's stylesheet, inside the vendored folder, and committed
    <code>fix(ui): round the badge</code>. The first hop sends the app's library folder to a branch
    of the middle repository:
  </p>
  <DocsCode label={APP_PUSH.label} code={APP_PUSH.code} />
  <DocsCode label={MIDDLE_RECEIVES.label} code={MIDDLE_RECEIVES.code} />
  <p>The second hop sends the middle repository's <code>core/</code> folder to the core:</p>
  <DocsCode label={MIDDLE_PUSH.label} code={MIDDLE_PUSH.code} />
  <DocsCode label={CORE_RECEIVES.label} code={CORE_RECEIVES.code} />
  <p>
    Both hops fast-forwarded, and the core's history stayed linear: its own two commits and the fix.
    The fix kept its message, scope included, so the core's log reads <code>fix(ui)</code> where a
    commit made in the core would have used the core's own scope. When the core then tagged the fix
    as
    <code>v0.3.0</code> and both repositories pulled it, each pull was a merge that changed no file:
  </p>
  <DocsCode label={ROUND_TRIP.label} code={ROUND_TRIP.code} />
  <p>
    So a CSS fix made in Dokseo takes two pushes and two merges to reach the core, then two pulls to
    come back. Made in the core repository first, the same fix is one commit and two pulls. Both are
    accepted: CSS changes belong in the core repository, and a fix made in an app first may take the
    two hops. Once <code>kandan-ui-vanilla</code> exists, it receives the fix with its own next pull of
    the core.
  </p>
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.shortcut}>
  <p>
    Splitting the nested folder straight out of the app would skip the middle hop. It did not work:
  </p>
  <DocsCode label={SHORTCUT_SPLIT.label} code={SHORTCUT_SPLIT.code} />
  <p>
    I did not dig into the cause. The two hops work, and they keep the middle repository's history
    in step with what the core received.
  </p>
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.pullAfterPush}>
  <p>
    The round trip above merged cleanly because nothing touched the badge again after the push. When
    the library does change a file again, the next pull conflicts, even though the app holds nothing
    the library lacks. The reason is the base of the merge.
  </p>
  <p>
    With <code>--squash</code>, each pull adds a new squash commit whose parent is the previous
    squash commit, and merges it (<a href={VENDORED_SQUASH_HREF}
      >What --squash leaves in the history</a
    >). A three-way merge compares each side with that base, not with each other. The base is the
    library as the app last pulled it. A push does not move it, because a push adds no squash
    commit. So the steps go:
  </p>
  <StepList>
    <StepItem title="The app pulls">The base is now the library at that commit.</StepItem>
    <StepItem title="The app edits a file and pushes the edit back">
      The library takes the commit as it is. The app's base does not change.
    </StepItem>
    <StepItem title="The library edits the same file again">
      The library side now differs from the base by the app's edit and its own.
    </StepItem>
    <StepItem title="The app pulls">
      The app side differs from the base by the app's edit alone. Where the two sides' changes
      overlap, or where both sides added the same file with different contents, the merge stops with
      a conflict.
    </StepItem>
  </StepList>
  <p>
    The conflict is not a real disagreement: the library's side already holds the app's edit. A
    worse case raises no conflict at all. A file the app added, pushed, and the library later moved
    or deleted was only ever added at the old path on one side of the merge, so the merge keeps it
    there, with nothing to say so.
  </p>
  <p>
    Kandan UI's guide, in the library's repository, gives the way out: take the library's side for
    each conflict, then check the whole folder against the commit that was pulled before committing
    the merge. <code>git subtree pull</code> leaves that commit in <code>FETCH_HEAD</code>, and
    <code>git write-tree --prefix=</code> writes the staged folder as a tree, so a diff between the
    two prints nothing when the folder is the library exactly. <code>write-tree</code> refuses while a
    conflict is still unstaged, so the resolved files are added first:
  </p>
  <DocsCode label={RESOLVE_LABEL} code={RESOLVE_STEPS} />
  <p>
    Any line the diff prints names a file to fix, such as a moved file the merge kept at its old
    path. Dokseo met both cases on its first pull of the core (<a
      href={kandanCoreHref('phaseDokseo')}>Pulling the core into Dokseo</a
    >).
  </p>
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.rejected}>
  <p>
    One alternative avoids the subtree inside a subtree: each app vendors the core at one prefix and
    the Svelte version at another, and pulls them separately. I rejected it. The Svelte version
    reaches everything by relative path, which is what lets an app put it anywhere:
  </p>
  <DocsCode label={ANY_PREFIX.label} code={ANY_PREFIX.code} />
  <p>
    With two prefixes, every Svelte file that needs a core file would have to know where each app
    put the core, and that path differs from app to app. The Svelte version's own contract spec also
    needs the fixtures inside its repository. Nesting keeps both inside one folder, so the prefix
    rule holds.
  </p>
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.dokseo}>
  <p>
    Dokseo vendors only <code>kandan-ui-svelte</code>, at <code>src/lib/ui/</code>, so the core sits
    at <code>src/lib/ui/core/</code> as plain files. Dokseo imports the core's files at those paths,
    and a script import names the file with its <code>.js</code> extension, since the core is plain
    JavaScript. No module at an older path re-exports a core file. {DOKSEO_FILES_NAMING_CORE_PATHS.length}
    Dokseo files name a path in the core, and a docs spec keeps the list current:
  </p>
  <DocsCode
    label="Dokseo files that name a path in src/lib/ui/core/"
    code={DOKSEO_FILES_NAMING_CORE_PATHS.join('\n')}
  />
  <p>Among them are the stylesheet import and the font folder that the license plugin reads:</p>
  <DocsCode label={LIBRARY_STYLESHEET.label} code={LIBRARY_STYLESHEET.code} />
  <DocsCode label={FONT_FOLDER.label} code={FONT_FOLDER.code} />
  <p>
    Dokseo's own tools leave the core's files to the core (<a href={VENDORED_IGNORE_HREF}
      >How Dokseo ignores that tooling</a
    >). The unit project, the linter and the formatter skip <code>src/lib/ui/core/</code>,
    dependency-cruiser skips the core's specs, and the browser project skips the whole library (<a
      href={kandanCoreHref('coreChecks')}>The core's own checks</a
    >). The type check still reads the core's JavaScript with <code>checkJs</code>, and the
    library's contract specs run with Dokseo's unit specs. A core update reaches Dokseo as one
    subtree pull of
    <code>kandan-ui-svelte</code>, run on <code>main</code> like every library update (<a
      href={VENDORED_RULES_HREF}>Rules for a history with a subtree merge</a
    >).
  </p>
</DocsSection>
