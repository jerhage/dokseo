<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';

  type Attempt = { readonly label: string; readonly result: string };
  type Violation = {
    readonly directive: string;
    readonly blocked: string;
    readonly disposition: string;
  };

  const UNLISTED_ORIGIN = 'https://example.com/';

  let attempts = $state<readonly Attempt[]>([]);
  let violations = $state<readonly Violation[]>([]);

  function errorName(error: unknown): string {
    return error instanceof Error ? error.name : String(error);
  }

  function listenForViolations(node: HTMLElement): () => void {
    const owner = node.ownerDocument;
    const record = (event: SecurityPolicyViolationEvent): void => {
      violations = [
        ...violations,
        {
          directive: event.effectiveDirective,
          blocked: event.blockedURI,
          disposition: event.disposition,
        },
      ];
    };
    owner.addEventListener('securitypolicyviolation', record);
    return () => owner.removeEventListener('securitypolicyviolation', record);
  }

  function note(label: string, result: string): void {
    attempts = [...attempts, { label, result }];
  }

  function runNewFunction(): void {
    try {
      const compiled = new Function('return 1');
      note('new Function', `It ran and returned ${String(compiled())}.`);
    } catch (error) {
      note('new Function', `It threw ${errorName(error)}.`);
    }
  }

  function addInlineScript(): void {
    const script = document.createElement('script');
    script.textContent = "document.currentScript.dataset.ran = 'yes';";
    document.body.append(script);
    const ran = script.dataset['ran'] === 'yes';
    script.remove();
    note('Inline <script>', ran ? 'It ran.' : 'The element was added and its code did not run.');
  }

  async function fetchUnlisted(): Promise<void> {
    try {
      await fetch(UNLISTED_ORIGIN, { mode: 'no-cors' });
      note(`fetch ${UNLISTED_ORIGIN}`, 'The request went out.');
    } catch (error) {
      note(`fetch ${UNLISTED_ORIGIN}`, `The promise rejected with ${errorName(error)}.`);
    }
  }
</script>

<div class="stack-md" {@attach listenForViolations}>
  <div class="row wrap gap-2">
    <Button size="sm" onclick={runNewFunction}>Run new Function</Button>
    <Button size="sm" onclick={addInlineScript}>Add an inline script</Button>
    <Button size="sm" onclick={() => void fetchUnlisted()}>Fetch example.com</Button>
  </div>
  <Table size="sm" caption="What the code got back">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Attempt</TableHeaderCell>
        <TableHeaderCell>Result</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each attempts as attempt, index (index)}
        <TableRow>
          <TableCell><code>{attempt.label}</code></TableCell>
          <TableCell>{attempt.result}</TableCell>
        </TableRow>
      {:else}
        <TableRow>
          <TableCell colspan={2} class="text-muted">Nothing tried yet.</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <Table size="sm" caption="Violation events">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>effectiveDirective</TableHeaderCell>
        <TableHeaderCell>blockedURI</TableHeaderCell>
        <TableHeaderCell>disposition</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each violations as violation, index (index)}
        <TableRow>
          <TableCell><code>{violation.directive}</code></TableCell>
          <TableCell><code>{violation.blocked}</code></TableCell>
          <TableCell>{violation.disposition}</TableCell>
        </TableRow>
      {:else}
        <TableRow>
          <TableCell colspan={3} class="text-muted">No violation yet.</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
</div>
