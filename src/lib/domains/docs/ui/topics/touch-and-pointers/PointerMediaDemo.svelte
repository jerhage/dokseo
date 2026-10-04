<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import { mediaMatches } from '$lib/platform/dom/media-matches';
  import PageTurnSettings from '$lib/shared/PageTurnSettings.svelte';
  import type { TouchTurns } from '$lib/shared/page-turn';
  import { pointerKinds, shownTurnSettings } from '$lib/shared/turn-settings';
  import type { MediaMatches } from '$lib/shared/turn-settings';
  import { DEVICE_PRESETS, POINTER_QUERIES, presetMatches } from '../../../domain/pointer-devices';
  import type { DevicePreset } from '../../../domain/pointer-devices';
  import DocsDemo from '../../DocsDemo.svelte';

  type Snapshot = { readonly matched: ReadonlySet<string> };

  const FEATURES = ['pointer', 'any-pointer', 'hover', 'any-hover'] as const;

  let snapshot = $state.raw<Snapshot>(read());
  let preset = $state.raw<DevicePreset | null>(null);
  let lastPointer = $state<string | null>(null);
  let touchTurns = $state<TouchTurns>('swipe-only');
  let edgeClicksTurn = $state(true);

  const matches: MediaMatches = $derived(preset === null ? mediaMatches : presetMatches(preset));
  const kinds = $derived(pointerKinds(matches));
  const shown = $derived(shownTurnSettings(matches));

  function read(): Snapshot {
    return {
      matched: new Set(
        POINTER_QUERIES.filter((entry) => mediaMatches(entry.query)).map((entry) => entry.query),
      ),
    };
  }

  function matchedNow(query: string): boolean {
    return preset === null ? snapshot.matched.has(query) : preset.matching.includes(query);
  }

  function readAgain(): void {
    preset = null;
    snapshot = read();
  }
</script>

<DocsDemo label="This device's pointers">
  {#snippet controls()}
    <Button size="sm" variant="ghost" onclick={readAgain}>Read again</Button>
  {/snippet}
  {#snippet caption()}
    The answers come from the real <code>mediaMatches</code>, or from the device chosen above. The
    fieldset is the real <code>PageTurnSettings</code>, shown by the real
    <code>shownTurnSettings</code>; a choice made in it stays in this demo and is not saved.
  {/snippet}
  <div
    class="stack-md"
    onpointerdown={(event) => (lastPointer = event.pointerType)}
    role="presentation"
  >
    <div class="row wrap gap-2">
      <Button size="sm" variant={preset === null ? 'primary' : 'outline'} onclick={readAgain}
        >This device</Button
      >
      {#each DEVICE_PRESETS as device (device.key)}
        <Button
          size="sm"
          variant={preset?.key === device.key ? 'primary' : 'outline'}
          onclick={() => (preset = device)}>{device.label}, {device.detail}</Button
        >
      {/each}
    </div>
    <Table size="sm" caption="Which values match">
      <TableHeader>
        <TableRow>
          <TableHeaderCell>Feature</TableHeaderCell>
          <TableHeaderCell>Values</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each FEATURES as feature (feature)}
          <TableRow>
            <TableHeaderCell scope="row"><code>{feature}</code></TableHeaderCell>
            <TableCell>
              <span class="row wrap gap-2">
                {#each POINTER_QUERIES.filter((entry) => entry.feature === feature) as entry (entry.query)}
                  {#if matchedNow(entry.query)}
                    <Badge variant="success">{entry.value}</Badge>
                  {:else}
                    <span class="text-sm text-faint"><s>{entry.value}</s></span>
                  {/if}
                {/each}
              </span>
            </TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
    <p class="m-0 text-sm">
      <code>pointerKinds</code> gives <code>{kinds}</code>.
      {#if preset === null}
        Last pointer to press in this demo: <code>{lastPointer ?? 'none yet'}</code>.
      {/if}
    </p>
    {#if shown.touchTurns || shown.edgeClicks}
      <PageTurnSettings
        {shown}
        {touchTurns}
        {edgeClicksTurn}
        ontouchturns={(turns) => (touchTurns = turns)}
        onedgeclicksturn={(wanted) => (edgeClicksTurn = wanted)}
      />
    {:else}
      <p class="m-0 text-sm text-muted">Neither page-turn setting would show.</p>
    {/if}
  </div>
</DocsDemo>
