<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import { WORD_PLAN_SECTIONS } from './word-analysis-plan/plan-sections';
  import WordConcepts from './word-analysis-plan/WordConcepts.svelte';
</script>

<DocsPage slug="word-analysis-plan" sections={Object.values(WORD_PLAN_SECTIONS)}>
  {#snippet lead()}
    How a program finds the words in Japanese and Korean text, with their readings and the base form
    a dictionary lists, how dictionaries such as JMdict are organized and licensed, and the plan for
    adding word analysis and lookup to Dokseo, decision by decision.
  {/snippet}
  <WordConcepts />
</DocsPage>
