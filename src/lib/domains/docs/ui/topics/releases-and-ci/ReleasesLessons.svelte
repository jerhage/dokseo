<script lang="ts">
  import StepItem from '$lib/ui/components/StepItem.svelte';
  import StepList from '$lib/ui/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { RELEASE_SECTIONS, releaseHref } from './sections';

  const RELEASE_AS = `chore: release 1.0.0

Release-As: 1.0.0`;
</script>

<DocsSection title={RELEASE_SECTIONS.setup}>
  <p>
    release-please works out the next release from the last one, so a repository with no releases
    needs a starting point. I created a <code>v0.9.0</code> GitHub Release on main by hand, matching the
    manifest, before the first run. The first runs still went wrong, in this order:
  </p>
  <StepList>
    <StepItem title="The tag had the package name in it">
      In a manifest config, <code>include-component-in-tag</code> defaults to true. The root package
      is named <code>reader</code>, so the first release pull request was titled
      <code>chore(main): release reader 0.9.1</code>, and merging it tagged
      <code>reader-v0.9.1</code>.
    </StepItem>
    <StepItem title="The baseline was missed">
      The same default made release-please look for a last release tagged
      <code>reader-v0.9.0</code>. There was only <code>v0.9.0</code>, so it found none and collected
      the whole history: the 0.9.1 changelog listed 257 entries, every feature and fix commit since
      the repository began, under a compare link from <code>reader-v0.9.0</code>.
    </StepItem>
    <StepItem title="Plain tags, and the whole history again">
      I set <code>include-component-in-tag</code> to false, and a <code>v0.9.1</code> tag and
      release joined <code>reader-v0.9.1</code> on the same commit. The next release pull request
      still listed the whole history. release-please's documentation says it starts from the last
      merged release pull request, and the one merged pull request had the old title with
      <code>reader</code> in it, which no longer fits the title pattern without a component. That is my
      reading of why; the fix worked either way.
    </StepItem>
    <StepItem title="bootstrap-sha bounds the search">
      <code>bootstrap-sha</code> names the commit where collecting stops when no last release is
      found. Set to the 0.9.1 release commit, it made the next release pull request start after
      0.9.1. The 0.9.1 changelog entry was cut by hand to "First release." The 0.9.2 release pull
      request merged with the new title, so later runs find their last release and no longer use
      <code>bootstrap-sha</code>.
    </StepItem>
  </StepList>
  <p>
    The lesson is to settle the tag format before the first release, and to create the baseline
    release with exactly that format. The other early changes are in the sections above: CI dropped
    the browser tests after they failed on the runner, and the deploy moved from
    <code>wrangler-action</code> to the project's own wrangler.
  </p>
</DocsSection>

<DocsSection title={RELEASE_SECTIONS.one}>
  <p>
    With Dokseo's settings no commit type reaches 1.0.0. A breaking change before 1.0 bumps the
    minor, so 0.9.4 goes to 0.10.0, and the version could climb through 0.11, 0.12 and on forever.
    Going to 1.0 is a decision, not a bump, and release-please takes it as a footer:
  </p>
  <DocsCode label="The commit that makes the next release 1.0.0" code={RELEASE_AS} />
  <p>
    The footer's key is read in any letter case, and the newest commit with one sets the version of
    the next release pull request, whatever the other commits say. The commit can be empty, made
    with <code>--allow-empty</code> as in release-please's own example. A hidden type such as
    <code>chore</code> still shows in the changelog when it has the footer, so that release is never
    skipped as empty. The plan is to add this commit when the 1.0 list is done. The
    <a href={releaseHref('derive')}>calculator</a> has a "Reaching 1.0" set that shows it.
  </p>
  <p>
    1.0 also changes the rules from then on. The two pre-major settings apply only while the major
    is 0, so from 1.0.0 a <code>feat</code> bumps the minor and a breaking change the major. For Dokseo,
    1.0 promises that stored data stays readable: anything that breaks that later is a major version and
    comes with a way to recover.
  </p>
</DocsSection>

<DocsSection title={RELEASE_SECTIONS.rules}>
  <ul>
    <li>
      Version by what a reader notices. A reader who must act or loses something is a major change,
      something new is a minor one, something that works better is a patch.
    </li>
    <li>
      Write every commit as a Conventional Commit with one of the ten types, and mark a breaking
      change with <code>!</code> or a <code>BREAKING CHANGE:</code> footer.
    </li>
    <li>Release by merging the release pull request. Nothing else deploys automatically.</li>
    <li>
      Put the deploy in the same workflow as release-please, gated on <code>release_created</code>,
      because a release made with <code>GITHUB_TOKEN</code> starts no other workflow.
    </li>
    <li>
      Start every workflow at read-only permissions, widen them per job, and pass a secret only to
      the step that uses it.
    </li>
    <li>
      Run the static checks, the unit tests and the build in CI. Run the browser tests locally.
    </li>
    <li>Merge with rebase and merge, so main has no merge commits.</li>
    <li>Reach 1.0 with a <code>Release-As: 1.0.0</code> footer, not with a commit type.</li>
  </ul>
</DocsSection>
