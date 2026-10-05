<script lang="ts">
  import StepItem from '$lib/ui/components/StepItem.svelte';
  import StepList from '$lib/ui/components/StepList.svelte';
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import { DOKSEO_COMMIT_TYPES } from '../../../domain/dokseo-release';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import BumpCalculatorDemo from './BumpCalculatorDemo.svelte';
  import CommitCheckerDemo from './CommitCheckerDemo.svelte';
  import { RELEASE_SECTIONS, releaseHref } from './sections';

  const MESSAGE_FORM = `<type>[optional scope]: <description>

[optional body]

[optional footer(s)]`;

  const BREAKING_EXAMPLE = `feat(storage)!: keep captures in a new record format

The old records are read once and rewritten.

BREAKING CHANGE: export captures before updating, then import them
Refs #31`;
</script>

<DocsSection title={RELEASE_SECTIONS.path}>
  <p>
    Dokseo is a static site. The build turns the source into a folder of HTML, JavaScript, fonts and
    images, and the host serves that folder as it is. Between a commit and a reader's browser sit a
    few separate pieces:
  </p>
  <ul>
    <li>a version number that says what kind of change a release holds,</li>
    <li>commit messages written so a program can read them,</li>
    <li>a tool that reads those messages and works out the next version and the changelog,</li>
    <li>continuous integration, which runs the checks on every change,</li>
    <li>and a deploy step that builds a release and uploads it to the host.</li>
  </ul>
  <p>
    The first half below explains each piece on its own. The second half, from
    <a href={releaseHref('pipeline')}>Dokseo's pipeline</a> on, shows how Dokseo connects them with GitHub
    Actions, release-please and Cloudflare Workers.
  </p>
</DocsSection>

<DocsSection title={RELEASE_SECTIONS.semver}>
  <p>
    A semantic version has three numbers, <code>MAJOR.MINOR.PATCH</code>, and each one says
    something different about the change since the last release. The rules at
    <a href="https://semver.org/">semver.org</a> are written for a library, where the thing that can break
    is the public API that other code calls:
  </p>
  <ul>
    <li>
      Patch: "MUST be incremented if only backward compatible bug fixes are introduced." 1.4.2
      becomes 1.4.3.
    </li>
    <li>
      Minor: "MUST be incremented if new, backward compatible functionality is introduced to the
      public API." 1.4.2 becomes 1.5.0, and the patch goes back to 0.
    </li>
    <li>
      Major: "MUST be incremented if any backward incompatible changes are introduced to the public
      API." 1.4.2 becomes 2.0.0.
    </li>
  </ul>
  <p>
    The point is that someone who depends on version 1.4.2 can take any 1.x.y later than it without
    changing their own code, and has to read the notes before taking 2.0.0. The number is a promise
    about compatibility, not a count of work done.
  </p>
</DocsSection>

<DocsSection title={RELEASE_SECTIONS.breaking}>
  <p>
    An app like Dokseo has no public API. No other program calls it, so "backward incompatible" has
    to mean something a person notices. Dokseo's rule comes down to one question per release: does a
    reader have to act, or lose something, because of this change?
  </p>
  <Table size="sm" caption="What each bump means for Dokseo">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Bump</TableHeaderCell>
        <TableHeaderCell>Meaning</TableHeaderCell>
        <TableHeaderCell>Commit</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableHeaderCell scope="row">Major</TableHeaderCell>
        <TableCell
          >A reader must act or loses something: stored books or captures unreadable without action,
          an export file format that changes incompatibly, saved links such as
          <code>/read/&lt;id&gt;</code> that stop working, a feature removed.</TableCell
        >
        <TableCell
          ><code>feat!:</code>, <code>fix!:</code>, a <code>BREAKING CHANGE:</code> footer</TableCell
        >
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row">Minor</TableHeaderCell>
        <TableCell>A new capability a reader can see or use.</TableCell>
        <TableCell><code>feat:</code></TableCell>
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row">Patch</TableHeaderCell>
        <TableCell>Something that already exists works better: a fix, wording, speed.</TableCell>
        <TableCell><code>fix:</code>, <code>perf:</code></TableCell>
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row">None</TableHeaderCell>
        <TableCell>Nothing a reader sees changes.</TableCell>
        <TableCell
          ><code>refactor</code>, <code>test</code>, <code>docs</code>, <code>chore</code>,
          <code>style</code>, <code>build</code>, <code>ci</code></TableCell
        >
      </TableRow>
    </TableBody>
  </Table>
  <p>
    A change to how books are stored is the clearest major case. Say an update reads captures in a
    new record format and drops the old reader:
  </p>
  <ol>
    <li>A reader has 300 captures saved by the previous version.</li>
    <li>The page reloads into the new version.</li>
    <li>The captures are still in the browser's storage, but nothing can read them any more.</li>
  </ol>
  <p>
    Nothing about that change is visible in the code's interfaces, but it is the most breaking
    change an app like this can make. The version has to say so, and the release has to come with a
    way out, such as exporting before the update and importing after it.
  </p>
</DocsSection>

<DocsSection title={RELEASE_SECTIONS.preOne}>
  <p>
    Semantic versioning sets major version zero apart: "Major version zero (0.y.z) is for initial
    development. Anything MAY change at any time. The public API SHOULD NOT be considered stable."
    The specification gives no rule for bumping inside 0.y.z. Its FAQ suggests starting at 0.1.0 and
    incrementing the minor for each release.
  </p>
  <p>
    A common convention fills the gap by shifting every rule one place to the right while the major
    is 0: a breaking change bumps the minor (0.9.4 to 0.10.0), and a feature or a fix bumps the
    patch (0.9.4 to 0.9.5). release-please supports exactly that with two settings, and Dokseo turns
    both on. Each number is compared on its own, so 0.10.0 comes after 0.9.4. It is not a decimal.
  </p>
  <p>
    Dokseo started at 0.9.0, not 0.1.0. The app was close to the list of things that make 1.0, and
    0.9 says so, while 0.10.0 stays free for a breaking change before 1.0.
  </p>
</DocsSection>

<DocsSection title={RELEASE_SECTIONS.commits}>
  <p>
    A tool can only derive a version from commits if the commits say what they are. Conventional
    Commits is a small specification for that, at
    <a href="https://www.conventionalcommits.org/en/v1.0.0/">conventionalcommits.org</a>. A message
    has this form:
  </p>
  <DocsCode label="The Conventional Commits message form" code={MESSAGE_FORM} />
  <ul>
    <li>
      The type comes first, then an optional scope in parentheses, an optional <code>!</code>, and a
      colon and a space. <code>feat</code> means a new feature and <code>fix</code> a bug fix; other types
      are allowed.
    </li>
    <li>The body starts one blank line after the description.</li>
    <li>
      A footer is a word token, then <code>: </code> or <code> #</code>, then a value, as in
      <code>Refs #31</code>. A token uses <code>-</code> in place of spaces, with one exception.
    </li>
    <li>
      A breaking change is marked by a <code>!</code> right before the colon, or by a footer that
      starts with <code>BREAKING CHANGE: </code>. That footer must be in capitals, and
      <code>BREAKING-CHANGE</code> means the same thing.
    </li>
  </ul>
  <DocsCode label="A breaking change marked both ways" code={BREAKING_EXAMPLE} />
  <p>
    Dokseo allows exactly these types: {DOKSEO_COMMIT_TYPES.join(', ')}. A commit that touches only
    tests is <code>test</code>; tests that come with a feature ship in that feature's commit. Try a
    message here:
  </p>
  <CommitCheckerDemo />
</DocsSection>

<DocsSection title={RELEASE_SECTIONS.derive}>
  <p>
    With readable commits, the next version is arithmetic over the commits since the last release.
    This is the order release-please's source follows:
  </p>
  <StepList>
    <StepItem title="Collect and parse">
      Take every commit on the branch since the last release and parse each message. A message that
      does not parse as a conventional commit is dropped. A footer that itself parses as a commit,
      such as <code>fix(utils): …</code> under a <code>feat</code>, counts as a second commit.
    </StepItem>
    <StepItem title="Release-As wins">
      If any commit has a <code>Release-As: x.y.z</code> footer, the newest one sets the version and nothing
      else counts.
    </StepItem>
    <StepItem title="Breaking, then feature, then the rest">
      Any breaking change bumps the major, or the minor before 1.0 with
      <code>bump-minor-pre-major</code>. Otherwise any <code>feat</code> bumps the minor, or the
      patch before 1.0 with <code>bump-patch-for-minor-pre-major</code>. Otherwise the patch goes
      up.
    </StepItem>
    <StepItem title="Write the changelog">
      Each type maps to a section such as Features or Fixes. A hidden type is left out, unless the
      commit is breaking or has a Release-As footer. Breaking notes get their own section at the
      top.
    </StepItem>
    <StepItem title="Skip an empty release">
      If the changelog entry has nothing under its heading, there is no release.
    </StepItem>
  </StepList>
  <p>
    The last step is easy to misread. release-please's README says a release needs a "releasable
    unit", a <code>feat</code>, <code>fix</code> or <code>deps</code> commit. The code itself checks
    whether the changelog entry it built is empty, so with Dokseo's sections a lone
    <code>perf</code> commit also opens a release, and a breaking <code>refactor!</code> does too. A
    run of <code>refactor</code>, <code>test</code> and <code>docs</code> commits releases nothing.
  </p>
  <p>
    The calculator runs those rules. Pick a set of commits or type your own, and compare a version
    before 1.0 with one after it:
  </p>
  <BumpCalculatorDemo />
</DocsSection>

<DocsSection title={RELEASE_SECTIONS.releasePr}>
  <p>
    The bump rules say what the next version would be. A release pull request is a way to choose
    when it happens. release-please keeps one pull request open against the main branch. Every push
    to main recomputes it: the new version in <code>package.json</code> and in its own manifest
    file, and the new entry at the top of <code>CHANGELOG.md</code>. The pull request has the label
    <code>autorelease: pending</code>.
  </p>
  <p>
    Merging that pull request is the decision to release. On the push that the merge makes,
    release-please finds the merged pull request, tags the commit it put on main with the version,
    creates a GitHub Release with the changelog entry as its notes, and relabels the pull request
    <code>autorelease: tagged</code>.
  </p>
  <p>
    The other common design releases straight from CI, with no pull request in between:
    semantic-release runs "after every successful build on the release branch" and makes a release
    whenever the new commits include a release type. That ships each change as soon as it lands, and
    gives no point at which to look at the version and notes first or to batch several changes into
    one release. A release pull request costs one extra merge per release and gives both.
  </p>
</DocsSection>
