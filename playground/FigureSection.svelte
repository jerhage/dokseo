<script lang="ts">
  import Button from '../components/Button.svelte';
  import Figure from '../components/Figure.svelte';
  import DemoSection from './DemoSection.svelte';

  let count = $state(0);
</script>

<DemoSection
  id="figure"
  title="Figure"
  classes={[
    'figure',
    'figure-header',
    'figure-title',
    'figure-actions',
    'figure-body',
    'figure-caption',
  ]}
>
  <div class="grid-2">
    <Figure>
      <p class="m-0">Any content: an inline SVG, a table, a live example.</p>
      {#snippet caption()}A caption under the framed body.{/snippet}
    </Figure>
    <Figure>
      {#snippet title()}Live{/snippet}
      {#snippet actions()}
        <Button size="sm" variant="ghost" onclick={() => (count = 0)}>Reset</Button>
      {/snippet}
      <Button size="sm" onclick={() => (count += 1)}>Pressed {count} times</Button>
      {#snippet caption()}A title and actions above the body.{/snippet}
    </Figure>
  </div>
</DemoSection>
