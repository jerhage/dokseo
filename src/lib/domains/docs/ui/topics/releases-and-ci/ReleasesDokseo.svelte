<script lang="ts">
  import { version } from '$app/environment';
  import Badge from '$lib/ui/components/Badge.svelte';
  import Diagram from '$lib/ui/components/Diagram.svelte';
  import Figure from '$lib/ui/components/Figure.svelte';
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import { APP_VERSION } from '$lib/shared/app-version';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { RELEASE_FLOW, VERIFY_LADDER } from './release-diagrams';
  import {
    APP_VERSION_DEFINE,
    APP_VERSION_SHOWN,
    CI_WORKFLOW,
    DEPLOY_JOB,
    PACKAGE_VERSION,
    RELEASE_CONFIG,
    RELEASE_TRIGGER,
    VERIFY_SCRIPTS,
    WRANGLER_CONFIG,
  } from './release-snippets';
  import { RELEASE_SECTIONS, releaseHref } from './sections';
  import WorkflowDemo from './WorkflowDemo.svelte';

  const MANIFEST = JSON.stringify({ '.': APP_VERSION }, null, 2);
</script>

<DocsSection title={RELEASE_SECTIONS.pipeline}>
  <p>
    Dokseo has two workflows. <code>ci.yml</code> checks every pull request and every push to main.
    <code>release.yml</code> runs on every push to main as well, keeps the release pull request up to
    date, and, on the push that merges it, releases and deploys.
  </p>
  <Figure>
    <Diagram {...RELEASE_FLOW} />
    {#snippet caption()}
      From commits on main to a deployed release. Both release-please boxes are the same job in two
      different runs; the deploy job runs in the second.
    {/snippet}
  </Figure>
  <p>Pick an event to see which of the three jobs run, and the condition that settles each one:</p>
  <WorkflowDemo />
</DocsSection>

<DocsSection title={RELEASE_SECTIONS.ciWorkflow}>
  <DocsCode label={CI_WORKFLOW.label} code={CI_WORKFLOW.code} />
  <ul>
    <li>
      <code>pull_request</code> with no filter runs for a pull request into any branch, and
      <code>push</code> is limited to main, so a push to a feature branch with no pull request starts
      nothing.
    </li>
    <li>
      <code>permissions: contents: read</code> gives the run's token read access only. CI never writes
      to the repository.
    </li>
    <li>
      Deno is pinned to the version used locally, so CI and a local run resolve and run the same
      way. <code>deno install --frozen</code> fails if <code>deno.lock</code> is out of date, instead
      of updating it.
    </li>
    <li>
      <code>deno task verify:ci</code> is the whole check. The next section explains what it runs.
    </li>
  </ul>
</DocsSection>

<DocsSection title={RELEASE_SECTIONS.ladder}>
  <p>
    The checks are <code>package.json</code> scripts built on each other, so a shared step is written
    once:
  </p>
  <DocsCode label={VERIFY_SCRIPTS.label} code={VERIFY_SCRIPTS.code} />
  <Figure>
    <Diagram {...VERIFY_LADDER} />
    {#snippet caption()}
      Each rung adds to the one above it. <code>verify:ci</code> branches off the static checks.
    {/snippet}
  </Figure>
  <Table size="sm" caption="Which check runs where">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Script</TableHeaderCell>
        <TableHeaderCell>Runs</TableHeaderCell>
        <TableHeaderCell>Used</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableHeaderCell scope="row"><code>verify:static</code></TableHeaderCell>
        <TableCell>svelte-check, oxlint, the oxfmt check, dependency-cruiser</TableCell>
        <TableCell>Inside the other three</TableCell>
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row"><code>verify:tests</code></TableHeaderCell>
        <TableCell
          >The static checks, then every test: the unit project, then the browser project</TableCell
        >
        <TableCell>Locally, while working</TableCell>
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row"><code>verify</code></TableHeaderCell>
        <TableCell><code>verify:tests</code>, then the production build</TableCell>
        <TableCell>Locally, once before a commit</TableCell>
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row"><code>verify:ci</code></TableHeaderCell>
        <TableCell>The static checks, the unit project only, then the build</TableCell>
        <TableCell>In CI</TableCell>
      </TableRow>
    </TableBody>
  </Table>
  <p>
    The unit project runs in plain Node, and the browser project runs component tests in a real
    Chromium through Playwright. CI leaves the browser project out, and that was a choice made after
    a failure. The first CI workflow ran <code>verify:tests</code> and installed Chromium:
  </p>
  <ol>
    <li>
      A browser test in <code>flow-touch-turn.svelte.spec.ts</code> turns an EPUB page across a chapter,
      then rests 400 ms before it checks the result.
    </li>
    <li>
      On the GitHub runner, the chapter turn outlasted those 400 ms, as it does on any slow CPU.
    </li>
    <li>
      Both tests in that file failed. With the CPU throttled ten times through the Chrome DevTools
      Protocol, they fail the same way on a fast machine.
    </li>
  </ol>
  <p>
    I decided browser tests are not worth running in CI. The risk is real: a regression that only a
    browser test catches reaches main, and shows up at the next local <code>verify</code>. In
    exchange, CI installs no browser and does not fail on timing. Browser tests are rare in Dokseo
    in any case, written only for a bug a unit test cannot reach.
  </p>
</DocsSection>

<DocsSection title={RELEASE_SECTIONS.releaseWorkflow}>
  <DocsCode label={RELEASE_TRIGGER.label} code={RELEASE_TRIGGER.code} />
  <p>
    The workflow starts at read-only permissions, and only the release-please job may write contents
    (tags, releases, the release branch) and pull requests. The job exposes two of the action's
    outputs, <code>release_created</code> and <code>tag_name</code>, so the next job can read them.
  </p>
  <DocsCode label={DEPLOY_JOB.label} code={DEPLOY_JOB.code} />
  <ul>
    <li>
      <code>needs: release-please</code> makes the deploy wait for the first job, and the
      <code>if:</code> lets it run only when that job created a release, or when someone started the workflow
      by hand. A push of ordinary commits runs release-please and skips the deploy.
    </li>
    <li>
      The first step works out which tag to build. After a release it is the new tag. On a manual
      run there is none, so <code>gh release view</code> with no tag name looks up the latest release.
      A manual run therefore redeploys the latest release, not whatever is on main.
    </li>
    <li>
      <code>concurrency</code> puts every deploy in one group. With
      <code>cancel-in-progress: false</code> a running deploy is never stopped. A second one waits, and
      a third replaces the second while it is still waiting.
    </li>
    <li>
      The last step runs the project's own wrangler from <code>node_modules</code>, at the version
      in
      <code>deno.lock</code>. Cloudflare's <code>wrangler-action</code> did this first, but it runs on
      Node 20, which GitHub has deprecated, and it printed a warning on every deploy. The job installs
      the dependencies anyway, so the action added nothing but another third-party step.
    </li>
    <li>
      The Cloudflare token and account id are repository secrets, passed only to that last step.
    </li>
  </ul>
</DocsSection>

<DocsSection title={RELEASE_SECTIONS.config}>
  <DocsCode label={RELEASE_CONFIG.label} code={RELEASE_CONFIG.code} />
  <Table size="sm" caption="What each setting does">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Setting</TableHeaderCell>
        <TableHeaderCell>Effect</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableHeaderCell scope="row"><code>include-v-in-tag</code></TableHeaderCell>
        <TableCell>Tags read <code>v0.9.4</code>, not <code>0.9.4</code>.</TableCell>
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row"><code>include-component-in-tag</code></TableHeaderCell>
        <TableCell
          >Off, so the tag has no package name in front. It defaults to on, which
          <a href={releaseHref('setup')}>caused the first setup failure</a>.</TableCell
        >
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row"><code>bootstrap-sha</code></TableHeaderCell>
        <TableCell
          >Where to stop collecting commits when no earlier release is found. Unused once a release
          is found.</TableCell
        >
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row"><code>bump-minor-pre-major</code></TableHeaderCell>
        <TableCell>Before 1.0, a breaking change bumps the minor instead of the major.</TableCell>
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row"><code>bump-patch-for-minor-pre-major</code></TableHeaderCell>
        <TableCell>Before 1.0, a <code>feat</code> bumps the patch instead of the minor.</TableCell>
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row"><code>changelog-sections</code></TableHeaderCell>
        <TableCell
          >Features, Fixes and Performance are shown. The seven other types are hidden, so a release
          of only those types opens no release pull request.</TableCell
        >
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row"><code>packages</code></TableHeaderCell>
        <TableCell
          >One package at the repository root, of release type <code>node</code>, which also writes
          the version into <code>package.json</code>.</TableCell
        >
      </TableRow>
    </TableBody>
  </Table>
  <p>
    The manifest, <code>.release-please-manifest.json</code>, records the last released version of
    each package. release-please updates it in every release pull request, so it always matches
    <code>package.json</code>. For this build it reads:
  </p>
  <DocsCode label=".release-please-manifest.json, for this build" code={MANIFEST} />
  <p>
    One more file needed a change. release-please writes <code>CHANGELOG.md</code> in a form that
    oxfmt would reformat, which would fail the format check on every release pull request, so
    <code>.oxfmtrc.json</code> lists <code>CHANGELOG.md</code> under <code>ignorePatterns</code>.
  </p>
</DocsSection>

<DocsSection title={RELEASE_SECTIONS.deploy}>
  <DocsCode label={WRANGLER_CONFIG.label} code={WRANGLER_CONFIG.code} />
  <ul>
    <li>
      There is no <code>main</code> script, only <code>assets</code>, so the Worker is the files in
      <code>./build/</code>, which is where <code>adapter-static</code> writes the build.
    </li>
    <li>
      <code>not_found_handling: "single-page-application"</code> serves <code>index.html</code> for
      a link such as <code>/read/42</code>. It pairs with the adapter's
      <code>fallback: 'index.html'</code> in <code>vite.config.ts</code>, which writes that file.
    </li>
    <li>
      <code>workers_dev: false</code> turns off the
      <code>&lt;name&gt;.&lt;subdomain&gt;.workers.dev</code> address, and
      <code>preview_urls: true</code> turns on preview URLs of the form
      <code>&lt;version&gt;-&lt;name&gt;.&lt;subdomain&gt;.workers.dev</code>.
      <code>deno task deploy:preview</code> runs <code>wrangler versions upload</code>, which
      uploads a version without making it the deployed one.
    </li>
    <li>
      <code>static/_headers</code> is copied into <code>build/</code> and sets the response headers:
      cross-origin isolation, <code>frame-ancestors 'self'</code>, <code>no-cache</code> for most
      files, and a year of <code>immutable</code> caching for the hashed files under
      <code>/_app/immutable/</code>, the fonts among them. The
      <a href="/docs/security-headers#where-dokseo-s-headers-come-from">security headers</a> page explains
      each one.
    </li>
  </ul>
  <p>
    <code>deno task deploy</code> runs the same <code>wrangler deploy</code> by hand, from whatever
    is in <code>build/</code>. The workflow is the only automatic deploy.
  </p>
</DocsSection>

<DocsSection title={RELEASE_SECTIONS.version}>
  <p>
    Dokseo has two versions, and Settings, App shows both. The release version is the semver that
    release-please writes into <code>package.json</code>. The build reads it and defines it as a
    constant in the app's code:
  </p>
  <DocsCode label={PACKAGE_VERSION.label} code={PACKAGE_VERSION.code} />
  <DocsCode label={APP_VERSION_DEFINE.label} code={APP_VERSION_DEFINE.code} />
  <p>
    <code>src/lib/shared/app-version.ts</code> exports it as <code>APP_VERSION</code>, typed through
    <code>ImportMetaEnv</code> in <code>app.d.ts</code>. The build version is SvelteKit's
    <code>version</code> from <code>$app/environment</code>, which changes on every build:
  </p>
  <DocsCode label={APP_VERSION_SHOWN.label} code={APP_VERSION_SHOWN.code} />
  <p class="row wrap items-center gap-2">
    This page: version <Badge>{APP_VERSION}</Badge> build <Badge>{version}</Badge>
  </p>
  <p>
    The two cannot be one number. The service worker's cache has to change name on every build, and
    a release can be built more than once. The
    <a href="/docs/offline#the-build-version-and-the-release-version">offline page</a> explains why the
    cache uses the build version.
  </p>
</DocsSection>
