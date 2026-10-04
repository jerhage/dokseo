<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import { SERIES_PLAN_SECTIONS } from './series-plan/series-sections';
  import SeriesConcepts from './series-plan/SeriesConcepts.svelte';
  import SeriesFormats from './series-plan/SeriesFormats.svelte';
  import SeriesPlanBuilt from './series-plan/SeriesPlanBuilt.svelte';
  import SeriesPlanDecisions from './series-plan/SeriesPlanDecisions.svelte';
  import SeriesPlanRemaining from './series-plan/SeriesPlanRemaining.svelte';
</script>

<DocsPage slug="series-plan" sections={Object.values(SERIES_PLAN_SECTIONS)}>
  {#snippet lead()}
    What a series is to a reader, why a change to stored data can break an app that keeps everything
    in the browser, how EPUB and ComicInfo files state a series, and the plan for series in Dokseo:
    the groundwork already in place before 1.0, the decisions behind it, and what remains.
  {/snippet}
  <SeriesConcepts />
  <SeriesFormats />
  <SeriesPlanBuilt />
  <SeriesPlanDecisions />
  <SeriesPlanRemaining />
</DocsPage>
