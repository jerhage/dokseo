<script lang="ts">
  import CodeBlock from '$lib/components/CodeBlock.svelte';
  import Diagram from '$lib/components/Diagram.svelte';
  import Button from '$lib/components/Button.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import {
    NARROWING_SAMPLES,
    narrowingPath,
    narrowingTree,
    sampleNamed,
    shownSample,
  } from './narrowing-tree';
  import type { SampleName } from './narrowing-tree';

  let chosen = $state<SampleName>('date');

  const sample = $derived(sampleNamed(chosen));
  const tree = $derived(narrowingTree(narrowingPath(sample.value)));
</script>

<DocsDemo label="Narrow a value">
  <div class="stack-md">
    <div class="row wrap gap-2" role="group" aria-label="The value">
      {#each NARROWING_SAMPLES as option (option.name)}
        <Button
          size="sm"
          variant={option.name === chosen ? 'primary' : 'outline'}
          aria-pressed={option.name === chosen}
          onclick={() => (chosen = option.name)}>{option.label}</Button
        >
      {/each}
    </div>
    <div class="grid-2 gap-3">
      <Diagram {...tree} />
      <CodeBlock code={shownSample(sample.value)} label="The value at run time" />
    </div>
  </div>
  {#snippet caption()}
    The highlighted boxes are the checks this value goes through, run in this browser, and the type
    it ends as. Each box's small text is the type TypeScript gives the value when it reaches that
    check. The anchors come from Dokseo's real <code>regionAnchor</code> and
    <code>textAnchor</code>.
  {/snippet}
</DocsDemo>
