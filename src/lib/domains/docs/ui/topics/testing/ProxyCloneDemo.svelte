<script lang="ts">
  import Alert from '$lib/components/Alert.svelte';
  import Button from '$lib/components/Button.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import { CloneTrial } from './proxy-clone.svelte';

  const trial = new CloneTrial();
</script>

<DocsDemo label="structuredClone on a $state object, in this browser">
  {#snippet caption()}
    <code>structuredClone</code> uses the same structured clone algorithm as an IndexedDB
    <code>put</code>. The object is a small sample held in <code>$state</code>; nothing is stored.
  {/snippet}
  <div class="stack-md">
    <div class="row wrap gap-2">
      <Button size="sm" variant="outline" onclick={() => trial.cloneDirect()}
        >structuredClone(plan)</Button
      >
      <Button size="sm" variant="outline" onclick={() => trial.cloneSnapshot()}
        >structuredClone($state.snapshot(plan))</Button
      >
    </div>
    {#if trial.outcome?.kind === 'refused'}
      <Alert variant="danger" title={trial.outcome.name}>{trial.outcome.message}</Alert>
    {:else if trial.outcome?.kind === 'cloned'}
      <Alert variant="success" title="Cloned">
        <code>{trial.outcome.copy}</code>
      </Alert>
    {/if}
  </div>
</DocsDemo>
