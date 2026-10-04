<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import SegmentedControl from '$lib/components/SegmentedControl.svelte';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import { CONSENT_RULES } from './consent-rules';
  import { RevertBench } from './testing-demos.svelte';

  const bench = new RevertBench();
</script>

<DocsDemo label="The decisionOf cases against three rules">
  {#snippet caption()}
    The fix is the real <code>decisionOf</code>. The other two rules are written for this demo: the
    rule before the fix, where any record for the language granted the download, and a fix that
    shows the consent dialog again only when the model grows. The nine cases are the real spec's,
    built with the real
    <code>grantedConsent</code> and <code>modelFootprint</code>.
  {/snippet}
  <div class="stack-md">
    <SegmentedControl
      label="Rule"
      variant="track"
      options={CONSENT_RULES}
      value={bench.rule}
      onvaluechange={(value) => bench.choose(value)}
    />
    <Table size="sm" caption="reports $what as $decision">
      <TableHeader>
        <TableRow>
          <TableHeaderCell>Case</TableHeaderCell>
          <TableHeaderCell>Expected</TableHeaderCell>
          <TableHeaderCell>Result</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each bench.summary.runs as run (run.consentCase.what)}
          <TableRow>
            <TableCell class="text-sm">{run.consentCase.what}</TableCell>
            <TableCell><code>{run.consentCase.decision}</code></TableCell>
            <TableCell>
              {#if run.outcome.kind === 'passed'}
                <Badge variant="success">passed</Badge>
              {:else}
                <Badge variant="danger">failed</Badge>
              {/if}
            </TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
    <p class="m-0 text-sm" aria-live="polite">
      {#if bench.summary.failing === 0}
        Every case passes.
      {:else}
        {bench.summary.failing} of {bench.summary.runs.length} cases fail, so this rule cannot pass the
        test.
      {/if}
    </p>
  </div>
</DocsDemo>
