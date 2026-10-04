<script lang="ts">
  import { match } from 'ts-pattern';
  import Button from '$lib/components/Button.svelte';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import { frameOutcome } from '../../../domain/security-headers';
  import type { FrameObservation } from '../../../domain/security-headers';
  import { observeChapterFrame, observeFrame } from './probes';

  type Row = { readonly frame: string; readonly result: string };

  const CHAPTER_SANDBOX = 'allow-same-origin allow-scripts';
  const SAME_ORIGIN_PAGE = '/manifest.webmanifest';

  let host = $state<HTMLElement | null>(null);
  let rows = $state<readonly Row[]>([]);
  let running = $state(false);

  function described(observation: FrameObservation): string {
    return match(frameOutcome(observation))
      .with({ kind: 'readable' }, ({ text }) => `load fired; the document reads "${text.trim()}"`)
      .with({ kind: 'opaque' }, () => 'load fired; contentDocument is null')
      .with({ kind: 'no-load' }, () => 'load never fired')
      .exhaustive();
  }

  async function run(target: HTMLElement): Promise<void> {
    running = true;
    const plain = await observeChapterFrame(target, null);
    const sandboxed = await observeChapterFrame(target, CHAPTER_SANDBOX);
    const refused = await observeFrame(target, SAME_ORIGIN_PAGE, null);
    rows = [
      { frame: 'blob: document', result: described(plain) },
      { frame: `blob: document, sandbox="${CHAPTER_SANDBOX}"`, result: described(sandboxed) },
      { frame: SAME_ORIGIN_PAGE, result: described(refused) },
    ];
    running = false;
  }
</script>

<div class="stack-md" bind:this={host}>
  <div class="row wrap gap-2">
    <Button
      size="sm"
      loading={running}
      disabled={host === null}
      onclick={() => {
        if (host !== null) void run(host);
      }}
    >
      Frame the three documents
    </Button>
  </div>
  <Table size="sm" caption="What this page could read from each frame">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Frame</TableHeaderCell>
        <TableHeaderCell>Result</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each rows as row (row.frame)}
        <TableRow>
          <TableCell><code>{row.frame}</code></TableCell>
          <TableCell>{row.result}</TableCell>
        </TableRow>
      {:else}
        <TableRow>
          <TableCell colspan={2} class="text-muted">Not run yet.</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
</div>
