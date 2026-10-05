<script lang="ts">
  import { tick } from 'svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Toggle from '$lib/ui/components/Toggle.svelte';
  import type { CascadeEntry } from '../../../domain/cascade';
  import DocsDemo from '../../DocsDemo.svelte';
  import { cascadeFor, readPageStyles } from '../../stylesheet-rules';
  import CascadeList from './CascadeList.svelte';

  type Readout = {
    readonly property: string;
    readonly entries: readonly CascadeEntry[];
    readonly computed: string;
  };

  const PROPERTIES = ['color', 'border-radius'] as const;

  let active = $state(true);
  let danger = $state(false);
  let pill = $state(true);
  let squared = $state(false);
  let sample = $state<HTMLButtonElement | null | undefined>();
  let readouts = $state<readonly Readout[]>([]);

  function read(): void {
    if (sample === null || sample === undefined) return;
    const element = sample;
    const styles = readPageStyles(document);
    const computed = getComputedStyle(element);
    readouts = PROPERTIES.map((property) => ({
      property,
      entries: cascadeFor(element, property, styles),
      computed: computed.getPropertyValue(property),
    }));
  }

  async function readAfterChange(): Promise<void> {
    await tick();
    read();
  }

  function readOnMount(): void {
    void readAfterChange();
  }
</script>

<DocsDemo label="Layers against specificity">
  {#snippet caption()}
    Every rule in the list is read from this page's own stylesheets as it runs, with its layer and
    its specificity.
  {/snippet}
  <div class="stack-md" {@attach readOnMount}>
    <div class="row wrap gap-4">
      <Toggle bind:checked={active} onchange={readAfterChange}><code>active</code> prop</Toggle>
      <Toggle bind:checked={danger} onchange={readAfterChange}><code>.text-danger</code></Toggle>
      <Toggle bind:checked={pill} onchange={readAfterChange}><code>pill</code> prop</Toggle>
      <Toggle bind:checked={squared} onchange={readAfterChange}
        ><code>.rounded-control</code></Toggle
      >
    </div>
    <div class="row">
      <Button
        bind:ref={sample}
        {active}
        {pill}
        class={[danger && 'text-danger', squared && 'rounded-control']}>Sample button</Button
      >
    </div>
    {#each readouts as readout (readout.property)}
      <CascadeList {...readout} />
    {/each}
  </div>
</DocsDemo>
