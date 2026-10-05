<script lang="ts">
  import Badge from '$lib/ui/components/Badge.svelte';
  import CodeBlock from '$lib/ui/components/CodeBlock.svelte';
  import Field from '$lib/ui/components/Field.svelte';
  import Select from '$lib/ui/components/Select.svelte';
  import { MUTANTS, checkText } from '../../../domain/tap-zone-mutants';
  import DocsDemo from '../../DocsDemo.svelte';
  import { MutationBench } from './testing-demos.svelte';

  const bench = new MutationBench();
</script>

<DocsDemo label="Mutating a copy of tapZone">
  {#snippet caption()}
    The function runs from a copy whose operators change with the menu; a unit test checks that the
    unchanged copy quotes <code>page-turn.ts</code> exactly and returns what the real
    <code>tapZone</code> returns. The three tests are the real <code>tapZone</code> tests from
    <code>page-turn.spec.ts</code>, run in this page.
  {/snippet}
  <div class="stack-md">
    <Field label="Change">
      {#snippet children(control)}
        <Select
          {...control}
          value={bench.chosen}
          onchange={(event) => bench.choose(event.currentTarget.value)}
        >
          {#each MUTANTS as mutant (mutant.key)}
            <option value={mutant.key}>{mutant.label}</option>
          {/each}
        </Select>
      {/snippet}
    </Field>
    {#if bench.mutant !== undefined && bench.mutant.key !== 'original'}
      <p class="m-0 text-sm">
        The changed line reads <code>{bench.mutant.to}</code>.
      </p>
    {/if}
    <CodeBlock code={bench.source} label="isPositiveFinite and tapZone, as run" />
    <ul class="list-reset stack-sm">
      {#each bench.runs as run (run.test.name)}
        <li class="stack-sm">
          <div class="row gap-2 items-center">
            {#if run.verdict === 'passed'}
              <Badge variant="success">passed</Badge>
            {:else}
              <Badge variant="danger">failed</Badge>
            {/if}
            <span class="text-sm">{run.test.name}</span>
          </div>
          {#each run.outcomes as outcome, index (index)}
            {@const zoneCheck = run.test.checks[index]}
            {#if outcome.kind === 'failed' && zoneCheck !== undefined}
              <p class="m-0 text-sm text-muted">
                <code>{checkText(zoneCheck)}</code> expected <code>{outcome.expected}</code>,
                received <code>{outcome.received}</code>
              </p>
            {/if}
          {/each}
        </li>
      {/each}
    </ul>
    {#if bench.mutant !== undefined && bench.mutant.key !== 'original'}
      <p class="m-0 text-sm" aria-live="polite">
        {#if bench.failed === 0}
          The mutant survives these three tests.
        {:else}
          The mutant is killed: {bench.failed} of 3 tests fail.
        {/if}
        Applied to the real file, the same change failed
        {bench.mutant.appTestsFailing} of the app's unit tests{#if bench.mutant.appSpecFiles > 0},
          in {bench.mutant.appSpecFiles}
          {bench.mutant.appSpecFiles === 1 ? 'spec file' : 'spec files'}{/if}.
      </p>
    {/if}
  </div>
</DocsDemo>
