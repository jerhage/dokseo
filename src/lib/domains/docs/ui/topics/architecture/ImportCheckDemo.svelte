<script lang="ts">
  import Alert from '$lib/components/Alert.svelte';
  import Button from '$lib/components/Button.svelte';
  import Checkbox from '$lib/components/Checkbox.svelte';
  import Field from '$lib/components/Field.svelte';
  import Input from '$lib/components/Input.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import { CHECK_PRESETS, ImportCheck } from './import-check.svelte';
  import { ruleNote } from './rule-notes';

  const check = new ImportCheck();
</script>

<DocsDemo label="Would this import be allowed?">
  <div class="stack-md">
    <div class="row wrap gap-2">
      {#each CHECK_PRESETS as preset (preset.label)}
        <Button size="sm" variant="outline" onclick={() => check.use(preset)}>{preset.label}</Button
        >
      {/each}
    </div>
    <Field label="Importing file" hint="a path under src/, or $lib/…">
      {#snippet children(control)}
        <Input {...control} class="mono" bind:value={check.from} spellcheck="false" />
      {/snippet}
    </Field>
    <Field label="Imported file">
      {#snippet children(control)}
        <Input {...control} class="mono" bind:value={check.to} spellcheck="false" />
      {/snippet}
    </Field>
    <div class="row wrap items-center justify-between gap-2">
      <Checkbox
        checked={check.kind === 'type-only'}
        onchange={(event) => (check.kind = event.currentTarget.checked ? 'type-only' : 'value')}
        >An <code>import type</code></Checkbox
      >
      <Button size="sm" variant="ghost" onclick={() => check.swap()}>Swap the paths</Button>
    </div>
    {#if check.verdict.kind === 'incomplete'}
      <Alert variant="info" title="Two paths needed">Fill in both files.</Alert>
    {:else if check.verdict.kind === 'allowed'}
      <Alert variant="success" title="Allowed">
        No path rule forbids <code>{check.verdict.from}</code> importing
        <code>{check.verdict.to}</code>.
      </Alert>
    {:else}
      <Alert
        variant="danger"
        title="Forbidden by {check.verdict.rules.length === 1
          ? 'one rule'
          : `${check.verdict.rules.length} rules`}"
      >
        <ul class="col gap-2 list-reset m-0">
          {#each check.verdict.rules as rule (rule)}
            <li><code>{rule}</code>: {ruleNote(rule)}</li>
          {/each}
        </ul>
      </Alert>
    {/if}
  </div>
  {#snippet caption()}
    The verdict comes from a copy of the path rules in <code>.dependency-cruiser.cjs</code> and the
    way dependency-cruiser matches them, including the <code>$1</code> back-references. A test
    compares the copy with the config file and with dependency-cruiser's own validator on every pair
    of sample paths. <code>no-circular</code> and <code>no-unresolvable</code> need the whole import graph,
    so they are not run here.
  {/snippet}
</DocsDemo>
