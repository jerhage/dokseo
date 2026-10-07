<script lang="ts">
  import Diagram from '$lib/ui/components/Diagram.svelte';
  import Figure from '$lib/ui/components/Figure.svelte';
  import StepItem from '$lib/ui/components/StepItem.svelte';
  import StepList from '$lib/ui/components/StepList.svelte';
  import Table from '$lib/ui/components/Table.svelte';
  import DocsCode from '../DocsCode.svelte';
  import DocsPage from '../DocsPage.svelte';
  import DocsSection from '../DocsSection.svelte';
  import {
    AFTER_RELEASE,
    CORE_RELEASE,
    DOKSEO_PULL,
    FORCED_VERSION,
    LIBRARY_PULL,
    ORDINARY_REJECTED,
    PULL_CHECK,
    SUBTREE_REJECTED,
  } from './contributing/contributing-commands';
  import {
    CONTRIBUTING_SECTIONS,
    CORE_FIX_BACK_HREF,
    CORE_UPDATES_HREF,
    RELEASES_DERIVE_HREF,
    RELEASES_MERGING_HREF,
    RELEASES_WORKFLOW_HREF,
    STORED_CHANGING_HREF,
    VENDORED_HISTORY_RULES_HREF,
    VENDORED_UPDATE_HREF,
  } from './contributing/contributing-sections';
  import {
    CHANGELOG_SECTIONS,
    CODEOWNERS,
    DEPLOY_CONDITION,
  } from './contributing/contributing-snippets';
  import {
    FLOW_EDGES,
    FLOW_HEIGHT,
    FLOW_LABEL,
    FLOW_NODES,
    FLOW_WIDTH,
  } from './contributing/flow-diagram';
</script>

{#snippet flowTitle()}A change from the core to a deployed Dokseo{/snippet}

<DocsPage slug="contributing" sections={Object.values(CONTRIBUTING_SECTIONS)}>
  {#snippet lead()}
    The commands for changing Kandan UI or Dokseo and shipping a Dokseo release, in the order they
    run.
  {/snippet}

  <DocsSection title={CONTRIBUTING_SECTIONS.repos}>
    <p class="prose">
      Dokseo's UI comes from two other repositories. Each one vendors the next with
      <code>git subtree</code>, so a change moves one way: core, then the Svelte library, then
      Dokseo.
    </p>
    <Table size="sm">
      <thead>
        <tr><th>Repository</th><th>Vendors</th><th>Versions</th></tr>
      </thead>
      <tbody>
        <tr>
          <td><code>kandan-ui</code>, the core</td>
          <td>nothing</td>
          <td>annotated tags <code>v0.x.y</code>, made by hand</td>
        </tr>
        <tr>
          <td><code>kandan-ui-svelte</code></td>
          <td>the core at <code>core/</code></td>
          <td>none; Dokseo pulls <code>main</code></td>
        </tr>
        <tr>
          <td>Dokseo</td>
          <td>the library at <code>src/lib/ui/</code></td>
          <td>tags <code>v1.x.y</code>, made by release-please on GitHub</td>
        </tr>
      </tbody>
    </Table>
    <Figure title={flowTitle}>
      <Diagram
        label={FLOW_LABEL}
        width={FLOW_WIDTH}
        height={FLOW_HEIGHT}
        nodes={FLOW_NODES}
        edges={FLOW_EDGES}
      />
    </Figure>
    <p class="prose">
      Why the core sits inside the Svelte library, and how a fix travels back up, is on <a
        href={CORE_UPDATES_HREF}>the core page</a
      >.
    </p>
  </DocsSection>

  <DocsSection title={CONTRIBUTING_SECTIONS.rules}>
    <ul class="prose">
      <li>
        Never edit a vendored folder: <code>src/lib/ui/</code> in Dokseo, <code>core/</code> in the
        library. Change the repository it comes from, then pull.
        <a href={CORE_FIX_BACK_HREF}>Sending a fix back</a> covers a change made in the wrong place.
      </li>
      <li>Run subtree pulls on <code>main</code>, from the GitHub URL, never a local path.</li>
      <li>
        Before a pull, run <code>git fetch</code> and <code>git pull --ff-only</code>:
        release-please merges its release commits on GitHub, so the local <code>main</code> is often behind.
      </li>
      <li>
        Never rebase a branch that holds a subtree merge (<a href={VENDORED_HISTORY_RULES_HREF}
          >why</a
        >). Feature branches hold only ordinary commits; rebase them onto <code>main</code> and land
        them with <code>git merge --ff-only</code>.
      </li>
      <li>Never move or delete a pushed tag. A bad version gets a new one.</li>
      <li>No commit trailers.</li>
    </ul>
    <p class="prose">
      In Dokseo and in <code>kandan-ui-svelte</code>, <code>.github/CODEOWNERS</code> names the
      owner of the vendored folder and of <code>.github/</code> itself. Dokseo's:
    </p>
    <DocsCode label={CODEOWNERS.label} code={CODEOWNERS.code} />
    <p class="prose">
      The <code>kandan-ui-svelte</code> file does the same for <code>/core/</code> and
      <code>/.github/</code>; <code>kandan-ui</code> vendors nothing and has none. The file only requests
      a review. Requiring it is a branch protection setting, "Require review from Code Owners", made in
      each repository's settings on GitHub rather than in a file.
    </p>
  </DocsSection>

  <DocsSection title={CONTRIBUTING_SECTIONS.types}>
    <p class="prose">
      release-please reads the type of every commit since the last release to pick Dokseo's next
      version (<a href={RELEASES_DERIVE_HREF}>how</a>).
    </p>
    <Table size="sm">
      <thead>
        <tr><th>Type</th><th>After 1.0</th></tr>
      </thead>
      <tbody>
        <tr><td><code>fix</code></td><td>patch, 1.4.2 to 1.4.3</td></tr>
        <tr><td><code>feat</code></td><td>minor, 1.4.2 to 1.5.0</td></tr>
        <tr>
          <td><code>type!:</code> or a <code>BREAKING CHANGE:</code> footer</td>
          <td>major, 1.4.2 to 2.0.0</td>
        </tr>
        <tr>
          <td>
            <code>chore</code>, <code>docs</code>, <code>refactor</code>, <code>test</code>,
            <code>style</code>, <code>ci</code>, <code>build</code>
          </td>
          <td>no release on their own</td>
        </tr>
      </tbody>
    </Table>
    <p class="prose">
      The changelog lists features, fixes and performance work and hides the rest:
    </p>
    <DocsCode label={CHANGELOG_SECTIONS.label} code={CHANGELOG_SECTIONS.code} />
    <ul class="prose">
      <li>
        The dev-only <code>/docs</code> pages are <code>docs(docs-pages)</code>, never
        <code>feat</code>: they never reach the production build.
      </li>
      <li>A library pull in Dokseo is <code>chore(ui)</code>.</li>
      <li>
        A change that breaks stored data is a major release with a migration (<a
          href={STORED_CHANGING_HREF}>the stored format</a
        >).
      </li>
    </ul>
    <p class="prose">
      The core has its own scale. A changed fixture, rule or <code>themeBootScript</code> output is a
      major version, a new one is a minor, and a CSS-only fix is a patch. Below 1.0 both major and minor
      raise the middle number, as v0.5.0 (new components) and v0.6.0 (changed fixtures) did.
    </p>
  </DocsSection>

  <DocsSection title={CONTRIBUTING_SECTIONS.core}>
    <p class="prose">
      Test, commit, tag, then push the commit and the tag together. Without
      <code>--follow-tags</code> the tag stays local and the next step cannot pull it.
    </p>
    <DocsCode label={CORE_RELEASE.label} code={CORE_RELEASE.code} />
  </DocsSection>

  <DocsSection title={CONTRIBUTING_SECTIONS.svelte}>
    <p class="prose">
      Pull the core at its tag. The pull opens an editor for the merge message; save it before
      closing. Then build or adapt components until the contract spec passes.
    </p>
    <DocsCode label={LIBRARY_PULL.label} code={LIBRARY_PULL.code} />
  </DocsSection>

  <DocsSection title={CONTRIBUTING_SECTIONS.dokseo}>
    <p class="prose">
      Dokseo pulls the library's <code>main</code>, not a tag. If <code>npm run verify</code> fails
      on a docs count that a drift spec flags, fix it in a separate <code>docs(docs-pages)</code>
      commit.
    </p>
    <DocsCode label={DOKSEO_PULL.label} code={DOKSEO_PULL.code} />
    <p class="prose">
      To check that the pull copied the library exactly, compare the squash commit with the folder.
      The command prints nothing when they match.
    </p>
    <DocsCode label={PULL_CHECK.label} code={PULL_CHECK.code} />
    <p class="prose">
      <a href={VENDORED_UPDATE_HREF}>Taking a library update</a> explains what the squash and the merge
      leave in the history.
    </p>
  </DocsSection>

  <DocsSection title={CONTRIBUTING_SECTIONS.release}>
    <StepList>
      <StepItem title="Push to main">
        release-please opens or updates a release pull request, <code
          >chore(main): release x.y.z</code
        >, from the commit types.
      </StepItem>
      <StepItem title="Merge the release pull request">
        Check its version, wait for CI, and merge it with rebase and merge (<a
          href={RELEASES_MERGING_HREF}>merge strategies</a
        >).
      </StepItem>
      <StepItem title="Tag and deploy">
        The release workflow tags <code>vx.y.z</code> on GitHub, and its deploy job runs because the release
        was created.
      </StepItem>
      <StepItem title="Catch up locally">
        The merge happened on GitHub, so fast-forward the local <code>main</code>.
      </StepItem>
    </StepList>
    <DocsCode label={DEPLOY_CONDITION.label} code={DEPLOY_CONDITION.code} />
    <DocsCode label={AFTER_RELEASE.label} code={AFTER_RELEASE.code} />
    <p class="prose">
      To force a version, push an empty commit with a <code>Release-As</code> footer.
      <a href={RELEASES_WORKFLOW_HREF}>The release workflow</a> has the full run.
    </p>
    <DocsCode label={FORCED_VERSION.label} code={FORCED_VERSION.code} />
  </DocsSection>

  <DocsSection title={CONTRIBUTING_SECTIONS.rejected}>
    <p class="prose">
      A push is rejected when the remote has commits the local branch lacks, usually a release
      commit. What to do depends on whether the local commits hold a subtree merge.
    </p>
    <p class="prose">
      If <code>git log --merges origin/main..main</code> prints nothing, they do not: rebase onto the
      remote and push.
    </p>
    <DocsCode label={ORDINARY_REJECTED.label} code={ORDINARY_REJECTED.code} />
    <p class="prose">
      If it prints a merge, do not rebase (<a href={VENDORED_HISTORY_RULES_HREF}>why</a>). Reset to
      the remote, run the same subtree pull again, and cherry-pick the ordinary commits on top. The
      branch <code>before-reset</code> keeps them reachable until then.
    </p>
    <DocsCode label={SUBTREE_REJECTED.label} code={SUBTREE_REJECTED.code} />
  </DocsSection>
</DocsPage>
