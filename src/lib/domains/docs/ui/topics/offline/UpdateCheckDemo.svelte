<script lang="ts">
  import Badge from '$lib/ui/components/Badge.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Field from '$lib/ui/components/Field.svelte';
  import Select from '$lib/ui/components/Select.svelte';
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import { getToaster } from '$lib/ui/components/toast-context';
  import { CHECK_KINDS, checkOutcomes, rehearse } from '../../../domain/update-rehearsal';
  import type { CheckKind, StandInWorker } from '../../../domain/update-rehearsal';
  import DocsDemo from '../../DocsDemo.svelte';

  type Rehearsing =
    | { readonly kind: 'idle' }
    | { readonly kind: 'checking' }
    | {
        readonly kind: 'returned';
        readonly returned: CheckKind;
        readonly found: StandInWorker | null;
      };

  const toaster = getToaster();
  const outcomes = checkOutcomes();

  let chosen = $state<CheckKind>('offline');
  let rehearsing = $state.raw<Rehearsing>({ kind: 'idle' });
  let installed = $state(false);
  let reloaded = $state(false);

  function choose(value: string): void {
    const kind = CHECK_KINDS.find((candidate) => candidate === value);
    if (kind !== undefined) chosen = kind;
  }

  async function check(): Promise<void> {
    rehearsing = { kind: 'checking' };
    installed = false;
    reloaded = false;
    const rehearsal = rehearse(chosen, toaster, () => (reloaded = true));
    const returned = await rehearsal.start();
    rehearsing = { kind: 'returned', returned: returned.kind, found: rehearsal.found };
  }

  function finish(worker: StandInWorker, state: 'installed' | 'redundant'): void {
    installed = true;
    worker.become(state);
  }
</script>

<Table size="sm" caption="Every ManualUpdateCheck and the toast it shows">
  <TableHeader>
    <TableRow>
      <TableHeaderCell>kind</TableHeaderCell>
      <TableHeaderCell>When</TableHeaderCell>
      <TableHeaderCell>Toast</TableHeaderCell>
    </TableRow>
  </TableHeader>
  <TableBody>
    {#each outcomes as outcome (outcome.kind)}
      <TableRow>
        <TableCell><code>{outcome.kind}</code></TableCell>
        <TableCell>{outcome.when}</TableCell>
        <TableCell>
          <span class="row wrap items-center gap-2">
            <Badge variant={outcome.toast.variant}>{outcome.toast.variant}</Badge>
            {outcome.toast.title}
            {#if outcome.toast.reload}<Badge variant="primary">Reload</Badge>{/if}
          </span>
        </TableCell>
      </TableRow>
    {/each}
  </TableBody>
</Table>

<DocsDemo label="Run the real checkNow()">
  {#snippet caption()}
    A real <code>ShellUpdates</code> with stand-in browser objects, showing its toasts on this page.
    The <code>unexpected</code> case also writes its error to the console, as the app does.
  {/snippet}
  <div class="stack-md">
    <div class="row wrap items-end gap-3">
      <Field label="Outcome to rehearse">
        {#snippet children(control)}
          <Select
            {...control}
            value={chosen}
            onchange={(event) => choose(event.currentTarget.value)}
          >
            {#each CHECK_KINDS as kind (kind)}
              <option value={kind}>{kind}</option>
            {/each}
          </Select>
        {/snippet}
      </Field>
      <Button
        variant="primary"
        loading={rehearsing.kind === 'checking'}
        onclick={() => void check()}
      >
        Check for updates
      </Button>
    </div>
    {#if rehearsing.kind === 'returned'}
      <p class="row wrap items-center gap-2 m-0">
        <code>checkNow()</code> returned <Badge variant="primary">{rehearsing.returned}</Badge>
      </p>
      {#if rehearsing.found !== null && !installed}
        {@const found = rehearsing.found}
        <p class="m-0 text-sm text-muted">The new worker is installing. Play the browser's part:</p>
        <div class="row wrap gap-2">
          <Button size="sm" onclick={() => finish(found, 'installed')}>Finish the install</Button>
          <Button size="sm" variant="ghost" onclick={() => finish(found, 'redundant')}>
            Fail the install
          </Button>
        </div>
      {/if}
      {#if reloaded}
        <p class="m-0">
          Reload was tapped: the waiting worker received <code>{`{ kind: 'skip-waiting' }`}</code>,
          took control, and <code>controllerchange</code> fired. The app would call
          <code>location.reload()</code> here; the demo stops instead.
        </p>
      {/if}
    {/if}
  </div>
</DocsDemo>
