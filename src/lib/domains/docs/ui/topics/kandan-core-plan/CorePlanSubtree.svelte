<script lang="ts">
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
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
  import { ANY_PREFIX } from './core-snippets';
  import { KANDAN_CORE_SECTIONS, VENDORED_PUSH_HREF, VENDORED_RULES_HREF } from './core-sections';
</script>

<DocsSection title={KANDAN_CORE_SECTIONS.nested}>
  <p>
    git subtree has no notion of nesting. <code>add</code> copies the files of one commit into a
    folder, and if that commit's repository vendored something itself, those files come along as
    ordinary files. Before planning on that, I ran the whole chain in scratch repositories with git
    2.46.1:
    <code>core</code> stands for <code>kandan-ui</code> (a badge stylesheet and its fixture, tagged
    <code>v0.1.0</code>), <code>middle</code> for <code>kandan-ui-svelte</code> (a
    <code>Badge.svelte</code>), and <code>app</code> for Dokseo. Paths are written relative to the repository
    the command runs in.
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
    come back. Made in the core repository first, the same fix is one commit and two pulls. CSS
    changes belong in the core repository.
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
