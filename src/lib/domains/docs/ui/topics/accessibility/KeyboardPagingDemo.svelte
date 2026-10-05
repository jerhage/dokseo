<script lang="ts">
  import { match } from 'ts-pattern';
  import Badge from '$lib/ui/components/Badge.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Input from '$lib/ui/components/Input.svelte';
  import SegmentedControl from '$lib/ui/components/SegmentedControl.svelte';
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import { isPagingFocus, isPagingKey } from '../../../domain/paging-keys';
  import type { PagingFocus, PagingHandler, PagingKey } from '../../../domain/paging-keys';
  import DocsCode from '../../DocsCode.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import { KeyboardPaging, LAST_PAGE, pagingVerdict } from './keyboard-paging.svelte';
  import type { PagingEntry, PagingVerdict } from './keyboard-paging.svelte';

  const HANDLER_OPTIONS = [
    { value: 'every-key', label: 'Every key' },
    { value: 'skips-buttons', label: 'Skips buttons' },
    { value: 'per-key', label: 'Per key' },
  ] as const;

  const HANDLER_CODE: Readonly<Record<PagingHandler, string>> = {
    'every-key': `window.addEventListener('keydown', (event) => {
  if (event.key === ' ' || event.key === 'ArrowRight') next();
  if (event.key === 'ArrowLeft') previous();
});`,
    'skips-buttons': `window.addEventListener('keydown', (event) => {
  if (event.target.closest('button, input, textarea')) return;
  if (event.key === ' ' || event.key === 'ArrowRight') next();
  else if (event.key === 'ArrowLeft') previous();
  else return;
  event.preventDefault();
});`,
    'per-key': `window.addEventListener('keydown', (event) => {
  if (event.target.closest('input, textarea, [contenteditable]')) return;
  if (event.key === ' ') {
    if (event.target.closest('button')) return;
    next();
  } else if (event.key === 'ArrowRight') next();
  else if (event.key === 'ArrowLeft') previous();
  else return;
  event.preventDefault();
});`,
  };

  const paging = new KeyboardPaging();

  let book = $state<HTMLElement>();

  function focusOf(target: EventTarget | null): PagingFocus | null {
    if (!(target instanceof HTMLElement)) return null;
    const named = target.dataset['pagingFocus'];
    return isPagingFocus(named) ? named : null;
  }

  function onkeydown(event: KeyboardEvent): void {
    const target = event.target;
    if (!(target instanceof Node) || book === undefined || !book.contains(target)) return;
    const focus = focusOf(target);
    if (focus === null) return;
    if (!isPagingKey(event.key) || event.altKey || event.ctrlKey || event.metaKey) {
      paging.released();
      return;
    }
    const answer = paging.pressed(event.key, focus);
    const cancels = answer.kind === 'turn' && answer.cancels;
    if (cancels || (focus === 'reading-area' && event.key === ' ')) event.preventDefault();
  }

  function keyName(key: PagingKey): string {
    return key === ' ' ? 'Space' : key;
  }

  function focusName(focus: PagingFocus): string {
    return match(focus)
      .with('reading-area', () => 'the page')
      .with('next-button', () => 'Next page')
      .with('contents-button', () => 'Contents')
      .with('text-field', () => 'Note')
      .exhaustive();
  }

  function verdictName(verdict: PagingVerdict): string {
    return match(verdict)
      .with('double-turn', () => 'double turn')
      .with('turned-and-pressed', () => 'turned and pressed')
      .with('dead-key', () => 'dead key')
      .with('as-expected', () => '')
      .exhaustive();
  }

  function moved(entry: PagingEntry): string {
    const total = entry.handlerTurn + entry.buttonTurn;
    return total > 0 ? `+${total}` : String(total);
  }
</script>

<svelte:window {onkeydown} />

<DocsDemo label="Turning pages with keys">
  {#snippet controls()}
    <Button size="sm" variant="ghost" onclick={() => paging.reset()}>Reset</Button>
  {/snippet}
  {#snippet caption()}
    Real key presses and real button activation in this browser; the log counts a turn by the
    handler and a turn by the Next page button separately. The demo listens on the window like a
    reader, but only for keys inside the demo, and it always cancels Space on the page itself so
    this documentation does not scroll.
  {/snippet}
  <div class="stack-md">
    <SegmentedControl label="Key handler" options={HANDLER_OPTIONS} bind:value={paging.handler} />
    <DocsCode label="The handler in use" code={HANDLER_CODE[paging.handler]} />
    <div class="stack-sm" bind:this={book}>
      <div class="row wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          data-paging-focus="contents-button"
          onclick={(event) => paging.clicked('contents', event.detail === 0)}>Contents</Button
        >
        <Button
          size="sm"
          variant="primary"
          data-paging-focus="next-button"
          onclick={(event) => paging.clicked('next', event.detail === 0)}>Next page</Button
        >
        <Input class="flex-1" aria-label="Note" placeholder="Note" data-paging-focus="text-field" />
      </div>
      <div
        class="stack-sm items-center bordered rounded-container surface-sunken p-6"
        role="group"
        aria-label="Book pages"
        tabindex="-1"
        data-paging-focus="reading-area"
      >
        <span class="text-lg weight-medium">Page {paging.page} of {LAST_PAGE}</span>
        <span class="text-sm text-muted">
          {paging.contentsOpen ? 'Contents is open.' : 'Click here to focus the page itself.'}
        </span>
      </div>
    </div>
    <p class="m-0 text-sm text-muted">
      Try each handler: click Next page with the mouse, then press Space, then the right arrow.
    </p>
    {#if paging.entries.length > 0}
      <Table size="sm">
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Key</TableHeaderCell>
            <TableHeaderCell>Focus</TableHeaderCell>
            <TableHeaderCell>Handler</TableHeaderCell>
            <TableHeaderCell>Button</TableHeaderCell>
            <TableHeaderCell>Pages</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each paging.entries as entry (entry.id)}
            <TableRow>
              <TableCell class="mono text-xs">{keyName(entry.key)}</TableCell>
              <TableCell>{focusName(entry.focus)}</TableCell>
              <TableCell class="mono text-xs">{entry.handlerTurn}</TableCell>
              <TableCell class="text-xs">
                {#if entry.buttonTurn !== 0}
                  pressed, {entry.buttonTurn}
                {:else if entry.contentsOpened}
                  pressed
                {:else}
                  none
                {/if}
              </TableCell>
              {@const verdict = pagingVerdict(entry)}
              <TableCell>
                <span class="row wrap items-center gap-1">
                  <Badge>{moved(entry)}</Badge>
                  {#if verdict !== 'as-expected'}
                    <Badge variant="danger">{verdictName(verdict)}</Badge>
                  {/if}
                </span>
              </TableCell>
            </TableRow>
          {/each}
        </TableBody>
      </Table>
    {/if}
  </div>
</DocsDemo>
