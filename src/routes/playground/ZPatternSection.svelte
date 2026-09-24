<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import DemoSection from './DemoSection.svelte';

  const ROWS = [
    { step: '01', title: 'Tokens in, brands out', text: 'Odd rows: media first, copy second.' },
    {
      step: '02',
      title: 'Layers keep the peace',
      text: 'Even rows flip, with the same markup order.',
    },
    { step: '03', title: 'Narrow containers stack', text: 'Below 40rem every row is one column.' },
  ];
</script>

<DemoSection id="l-z" title="Z-pattern" classes={['layout-z-pattern']}>
  <Card>
    <div class="layout-z-pattern">
      {#each ROWS as row (row.step)}
        <div>
          <Skeleton shape="block" />
          <div class="stack-sm">
            <span class="card-eyebrow">{row.step}</span>
            <h3>{row.title}</h3>
            <p class="text-sm text-muted">{row.text}</p>
          </div>
        </div>
      {/each}
    </div>
  </Card>
</DemoSection>
