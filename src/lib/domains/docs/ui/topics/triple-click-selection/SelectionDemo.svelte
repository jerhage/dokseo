<script lang="ts">
  import './triple-click.css';
  import { match } from 'ts-pattern';
  import Badge from '$lib/ui/components/Badge.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import { pointText, readSelection, sampleChapter } from './selection-reading';
  import type { RangeReading, SelectionReading } from './selection-reading';

  let sample: HTMLElement | undefined = $state();
  let middle: HTMLParagraphElement | undefined = $state();
  let last: HTMLParagraphElement | undefined = $state();
  let reading = $state<SelectionReading>({ kind: 'nothing' });

  const waiting = $derived(
    match(reading)
      .with({ kind: 'nothing' }, () => 'Nothing is selected in the sample yet.')
      .with(
        { kind: 'outside' },
        () => 'One edge of the selection is outside the sample, so there is no path to show.',
      )
      .with({ kind: 'read' }, () => null)
      .exhaustive(),
  );

  function read(): void {
    if (sample === undefined) return;

    const selection = document.getSelection();
    const range = selection !== null && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    reading = readSelection(sampleChapter(sample), range);
  }

  function selectAsFirefox(): void {
    if (middle === undefined) return;

    document.getSelection()?.setBaseAndExtent(middle, 0, middle, middle.childNodes.length);
  }

  function selectAsChrome(): void {
    const text = middle?.firstChild ?? null;
    if (text === null || last === undefined) return;

    document.getSelection()?.setBaseAndExtent(text, 0, last, 0);
  }
</script>

<svelte:document onselectionchange={read} />

{#snippet rangeBlock(title: string, range: RangeReading)}
  <div class="stack-sm">
    <p class="row items-center gap-2 m-0">
      <strong>{title}</strong>
      {#if range.collapsed}
        <Badge variant="danger">collapsed</Badge>
      {:else}
        <Badge variant="success">covers text</Badge>
      {/if}
    </p>
    <p class="m-0 text-sm">start: {pointText(range.start)}</p>
    <p class="m-0 text-sm">end: {pointText(range.end)}</p>
    <p class="m-0 text-sm selection-cfi"><code>{range.cfi}</code></p>
  </div>
{/snippet}

{#snippet controls()}
  <Button size="sm" variant="ghost" onclick={selectAsFirefox}>Firefox's range</Button>
  <Button size="sm" variant="ghost" onclick={selectAsChrome}>Chrome's range</Button>
{/snippet}

{#snippet caption()}
  Triple-click, double-click or drag in the sample. The two buttons set the range each browser makes
  for a triple-click on the second paragraph, by script, so either can be seen in any browser. The
  CFI comes from foliate-js's own <code>fromRange</code> on a copy of the sample placed as a chapter
  body at spine step <code>/6/12</code>; the second range is the real <code>textEdges</code>.
{/snippet}

<DocsDemo label="Selection edges, live" {controls} {caption}>
  <div class="stack-md triple-click">
    <div class="selection-sample" bind:this={sample}>
      <p>The ferry left at dawn, half empty.</p>
      <p bind:this={middle}>Nobody on deck spoke until the island came into view.</p>
      <p bind:this={last}>Then everyone spoke at once.</p>
    </div>
    {#if reading.kind === 'read'}
      {@render rangeBlock('The selection', reading.selection)}
      {#if reading.onText === null}
        <p class="m-0 text-sm text-muted">
          <code>textEdges</code> found no text inside this range.
        </p>
      {:else}
        {@render rangeBlock('After textEdges', reading.onText)}
      {/if}
    {:else}
      <p class="m-0 text-sm text-muted">{waiting}</p>
    {/if}
  </div>
</DocsDemo>
