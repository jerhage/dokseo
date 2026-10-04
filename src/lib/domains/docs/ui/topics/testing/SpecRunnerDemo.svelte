<script lang="ts">
  import Alert from '$lib/components/Alert.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Checkbox from '$lib/components/Checkbox.svelte';
  import Field from '$lib/components/Field.svelte';
  import Fieldset from '$lib/components/Fieldset.svelte';
  import Select from '$lib/components/Select.svelte';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import { TURN_QUERIES, settingsText } from '../../../domain/turn-cases';
  import DocsDemo from '../../DocsDemo.svelte';
  import { TurnRunner } from './turn-runner.svelte';

  const runner = new TurnRunner();

  const edited = $derived(runner.edited);
  const editedOutcome = $derived(runner.outcomes[runner.editing]);
</script>

<DocsDemo label="shownTurnSettings against six recorded cases">
  {#snippet controls()}
    <Button size="sm" variant="ghost" onclick={() => runner.reset()}>Reset cases</Button>
  {/snippet}
  {#snippet caption()}
    Each row is a row of the real <code>it.each</code> table, run against the real
    <code>shownTurnSettings</code> every time a box changes. The checks run in this page, not in Vitest.
  {/snippet}
  <div class="stack-md">
    <Table size="sm" caption="Cases">
      <TableHeader>
        <TableRow>
          <TableHeaderCell>Case</TableHeaderCell>
          <TableHeaderCell>Expected</TableHeaderCell>
          <TableHeaderCell>Result</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each runner.cases as turnCase, index (index)}
          {@const outcome = runner.outcomes[index]}
          <TableRow>
            <TableCell class={runner.editing === index ? 'text-sm weight-semibold' : 'text-sm'}
              >{turnCase.name}</TableCell
            >
            <TableCell class="text-sm">{settingsText(turnCase.expected)}</TableCell>
            <TableCell>
              {#if outcome?.kind === 'passed'}
                <Badge variant="success">passed</Badge>
              {:else}
                <Badge variant="danger">failed</Badge>
              {/if}
            </TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
    <Field label="Case to edit">
      {#snippet children(control)}
        <Select
          {...control}
          value={String(runner.editing)}
          onchange={(event) => runner.edit(Number(event.currentTarget.value))}
        >
          {#each runner.cases as turnCase, index (index)}
            <option value={String(index)}>{turnCase.name}</option>
          {/each}
        </Select>
      {/snippet}
    </Field>
    {#if edited !== undefined}
      <div class="grid-2 gap-4">
        <Fieldset legend="Media queries that match">
          {#each TURN_QUERIES as query (query)}
            <Checkbox
              checked={edited.matching.includes(query)}
              onchange={() => runner.toggleQuery(query)}><code>{query}</code></Checkbox
            >
          {/each}
        </Fieldset>
        <Fieldset legend="Expected settings">
          <Checkbox
            checked={edited.expected.touchTurns}
            onchange={() => runner.toggleExpected('touchTurns')}>touchTurns</Checkbox
          >
          <Checkbox
            checked={edited.expected.edgeClicks}
            onchange={() => runner.toggleExpected('edgeClicks')}>edgeClicks</Checkbox
          >
        </Fieldset>
      </div>
    {/if}
    {#if editedOutcome?.kind === 'failed'}
      <Alert variant="danger" title="expect(…).toEqual(…) failed">
        Expected <code>{editedOutcome.expected}</code>, received
        <code>{editedOutcome.received}</code>.
      </Alert>
    {/if}
    <p class="m-0 text-sm" aria-live="polite">
      {#if runner.verdict === 'passed'}
        The test passes: all {runner.cases.length} rows hold.
      {:else}
        The test fails: {runner.failures} of {runner.cases.length} rows do not hold.
      {/if}
    </p>
  </div>
</DocsDemo>
