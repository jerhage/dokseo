<script lang="ts">
  import Diagram from '$lib/components/Diagram.svelte';
  import Figure from '$lib/components/Figure.svelte';
  import StepItem from '$lib/components/StepItem.svelte';
  import StepList from '$lib/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { CI_FLOW } from './release-diagrams';
  import { RELEASE_SECTIONS, releaseHref } from './sections';

  const SECOND_WORKFLOW = `name: Deploy

on:
  release:
    types: [published]`;

  const SECRET_STEP = `- env:
    CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}
  run: ./node_modules/.bin/wrangler deploy`;
</script>

<DocsSection title={RELEASE_SECTIONS.ci}>
  <p>
    Continuous integration means every change is checked by a machine as soon as it is pushed,
    rather than when someone remembers to run the checks. On GitHub this is GitHub Actions. A
    workflow is a YAML file in <code>.github/workflows/</code>. Its <code>on:</code> key lists the
    events that start it, such as a push to a branch or a pull request, and its <code>jobs:</code>
    each run on a fresh virtual machine, the runner, as a list of steps.
  </p>
  <p>
    Every job reports a status on the commit it ran for, and a pull request shows those statuses as
    checks. A failing check on a pull request is the cue not to merge it. A failing check on main
    says main is broken now.
  </p>
  <Figure>
    <Diagram {...CI_FLOW} />
    {#snippet caption()}
      A push or a pull request starts the CI workflow, and its job's result becomes a check.
    {/snippet}
  </Figure>
</DocsSection>

<DocsSection title={RELEASE_SECTIONS.token}>
  <p>
    Each workflow run gets a token, <code>GITHUB_TOKEN</code>, that its steps use to call GitHub: to
    comment, push, open a pull request or create a release. GitHub treats events made with that
    token specially. Its documentation says: "When you use the repository's
    <code>GITHUB_TOKEN</code> to perform tasks, events triggered by the <code>GITHUB_TOKEN</code> will
    not create a new workflow run." That stops a workflow from starting itself in a loop. It also breaks
    the obvious way to deploy a release:
  </p>
  <DocsCode label="A separate deploy workflow that never runs" code={SECOND_WORKFLOW} />
  <StepList>
    <StepItem title="Merge the release pull request">
      The merge is a push to main made by a person, so the release workflow starts.
    </StepItem>
    <StepItem title="release-please creates the release">
      It creates the tag and the GitHub Release using the run's <code>GITHUB_TOKEN</code>.
    </StepItem>
    <StepItem title="The release event starts nothing">
      The release appears on GitHub with its notes, and the Deploy workflow above never runs,
      because the event came from <code>GITHUB_TOKEN</code>.
    </StepItem>
  </StepList>
  <p>
    There are two ways out. One is to give release-please a personal access token or a GitHub App
    token instead, since events made with those do start workflows. The other is to put the deploy
    in the same workflow as a second job that runs after release-please and checks its output.
    Dokseo does the second, so no extra credential exists.
  </p>
  <p>
    The rule has exceptions. A <code>workflow_dispatch</code> event, the kind a run started by hand
    makes, always creates a run, even when it comes from <code>GITHUB_TOKEN</code>. And when a
    workflow opens or updates a pull request with <code>GITHUB_TOKEN</code>, the resulting
    <code>pull_request</code> event creates runs that wait for approval. That applies to release-please's
    own pull request, so CI does not run on it by itself.
  </p>
</DocsSection>

<DocsSection title={RELEASE_SECTIONS.secrets}>
  <p>
    A deploy needs a credential for the host, and that must never be in the repository. GitHub keeps
    secrets in the repository's settings, and a workflow reads one only where it names it, as <code
      >{'${{ secrets.NAME }}'}</code
    >. A secret is not passed to steps on its own; the workflow sets it as an input or an
    environment variable of the step that needs it:
  </p>
  <DocsCode label="A secret passed to one step" code={SECRET_STEP} />
  <p>
    GitHub redacts a secret's value if a step prints it to the log. Passing it to one step rather
    than the whole job keeps it away from every other step, including third-party actions. The same
    idea applies to <code>GITHUB_TOKEN</code>: a <code>permissions:</code> block sets what it may do,
    and a workflow can start at read-only and widen it only for the job that writes.
  </p>
</DocsSection>

<DocsSection title={RELEASE_SECTIONS.hosting}>
  <p>
    A static site needs a host that serves files. Cloudflare Workers can do that without any server
    code: a Worker with static assets is configured with an <code>assets.directory</code>, and
    <code>wrangler deploy</code> uploads that folder. Cloudflare's documentation says a request whose
    URL matches a file is served "without invoking Worker code".
  </p>
  <p>
    A single-page app adds one problem. A link such as <code>/read/42</code> has no file behind it;
    the app's router draws that page in the browser. Opening that link directly would get a 404,
    unless the host falls back to the app's entry page. Setting
    <code>not_found_handling</code> to <code>"single-page-application"</code> does that: a
    navigation request that matches no file gets <code>/index.html</code> with <code>200 OK</code>.
    A navigation request is one with the header <code>Sec-Fetch-Mode: navigate</code>, which a
    browser sends when it loads a page.
  </p>
  <p>
    Response headers come from a <code>_headers</code> file in the assets folder: a path pattern on
    one line, then indented <code>Name: value</code> lines. A line <code>! Name</code> removes a header
    that a broader rule set. The rules apply to files served as assets, not to responses that Worker code
    builds.
  </p>
</DocsSection>

<DocsSection title={RELEASE_SECTIONS.merging}>
  <p>
    How a pull request is merged determines what main's history looks like, and with release-please
    it also determines what the changelog lists. GitHub offers three methods:
  </p>
  <ul>
    <li>
      Merge commit: "all commits from the feature branch are added to the base branch in a merge
      commit." History branches and joins.
    </li>
    <li>
      Squash and merge: "the pull request's commits are squashed into a single commit." One commit
      on main, and one changelog entry, per pull request.
    </li>
    <li>
      Rebase and merge: "all commits from the topic branch (or head branch) are added onto the base
      branch individually without a merge commit." Every commit lands on main, in a straight line,
      and GitHub always "creates new commit SHAs".
    </li>
  </ul>
  <p>
    release-please's README recommends squash. A branch often has commits that only make sense
    inside it, such as a <code>feat</code> and then a <code>fix</code> for a bug that the
    <code>feat</code> introduced and that never reached main. Squashed, the changelog shows the feature.
    Rebased, it also lists a fix for a bug no reader ever had.
  </p>
  <p>
    Dokseo uses rebase and merge, and its main has no merge commits. Each of its commits is a small,
    complete change with its own message, so each becomes its own line in history and in the
    changelog. The price is the one the README describes: a fix for a bug that the branch itself
    introduced has to be folded into the commit it fixes before the merge, or it shows up in the
    changelog. The new SHAs are visible in the 0.9.4 release: release-please's commit has one hash
    on its own branch and a different one on main, with the same content. The <a
      href={releaseHref('pipeline')}>next sections</a
    > show the whole pipeline.
  </p>
</DocsSection>
