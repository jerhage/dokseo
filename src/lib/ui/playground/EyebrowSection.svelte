<script lang="ts">
  import Card from '../components/Card.svelte';
  import DemoSection from './DemoSection.svelte';

  const SAMPLES = [
    { classes: 'eyebrow', text: 'Plain' },
    { classes: 'eyebrow text-faint', text: 'Continue reading' },
    { classes: 'eyebrow text-faint weight-semibold', text: 'Section caption' },
    { classes: 'eyebrow mono text-faint', text: 'Active engine' },
  ] as const;
</script>

<DemoSection id="eyebrow" title="Eyebrow" classes={['eyebrow']}>
  <p class="text-sm text-muted prose">
    A small upper-case caption over a group. Its colour, face and weight come from the utilities
    beside it; ListGroup's title applies it too.
  </p>
  <Card>
    <div class="grid-auto grid-auto-sm gap-4">
      {#each SAMPLES as sample (sample.classes)}
        <div class="stack-sm items-start">
          <p class={sample.classes}>{sample.text}</p>
          <code class="text-xs">.{sample.classes.split(' ').join(' .')}</code>
        </div>
      {/each}
    </div>
  </Card>
</DemoSection>
