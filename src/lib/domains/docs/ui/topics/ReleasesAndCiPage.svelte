<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import ReleasesConcepts from './releases-and-ci/ReleasesConcepts.svelte';
  import ReleasesDokseo from './releases-and-ci/ReleasesDokseo.svelte';
  import ReleasesLessons from './releases-and-ci/ReleasesLessons.svelte';
  import ReleasesPlumbing from './releases-and-ci/ReleasesPlumbing.svelte';
  import { RELEASE_SECTIONS } from './releases-and-ci/sections';
</script>

<DocsPage slug="releases-and-ci" sections={Object.values(RELEASE_SECTIONS)}>
  {#snippet lead()}
    A commit on main becomes a release when its message says what kind of change it is:
    release-please turns those messages into the next version and a changelog, merging its release
    pull request tags the release, and a job in the same GitHub Actions workflow deploys the tag to
    Cloudflare Workers.
  {/snippet}

  <ReleasesConcepts />
  <ReleasesPlumbing />
  <ReleasesDokseo />
  <ReleasesLessons />
</DocsPage>
