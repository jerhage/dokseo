<script lang="ts">
  import { onDestroy } from 'svelte';
  import { match } from 'ts-pattern';
  import Alert from '$lib/components/Alert.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import { decodeImage } from '$lib/platform/image/decode';
  import {
    decodedFigure,
    durationText,
    iosCanvasFit,
    sizeFigure,
  } from '../../../domain/bitmap-memory';
  import type { PixelSize } from '../../../domain/bitmap-memory';
  import { spaceFigure } from '../../../domain/storage-figures';
  import DocsDemo from '../../DocsDemo.svelte';
  import { DecodeBench } from './decode-bench.svelte';
  import type { DecodeSample } from './decode-bench.svelte';
  import { SCAN, SLICE, bundledPage, drawnJpeg } from './sample-images';

  type Props = { pageUrl: string };

  let { pageUrl }: Props = $props();

  const SAMPLE_LABELS: Readonly<Record<DecodeSample, string>> = {
    page: 'Sample page',
    scan: 'Scan',
    slice: 'Webtoon slice',
  };

  const made = new Map<DecodeSample, Promise<Blob>>();

  function blobFor(sample: DecodeSample): Promise<Blob> {
    const known = made.get(sample);
    if (known !== undefined) return known;
    const making = match(sample)
      .with('page', () => bundledPage(pageUrl))
      .with('scan', () => drawnJpeg(SCAN))
      .with('slice', () => drawnJpeg(SLICE))
      .exhaustive();
    made.set(sample, making);
    making.catch(() => made.delete(sample));
    return making;
  }

  const bench = new DecodeBench({ blobFor, decode: decodeImage, now: () => performance.now() });

  const statusText = $derived(
    match(bench.status)
      .with({ kind: 'idle' }, () => null)
      .with(
        { kind: 'preparing' },
        ({ sample }) => `Preparing the ${SAMPLE_LABELS[sample].toLowerCase()}…`,
      )
      .with({ kind: 'decoding' }, () => 'Calling createImageBitmap…')
      .with({ kind: 'failed' }, () => null)
      .exhaustive(),
  );

  function fitText(size: PixelSize): string {
    return match(iosCanvasFit(size))
      .with({ kind: 'fits-both' }, () => 'under both caps')
      .with({ kind: 'fits-current-only' }, () => 'over the Safari 17 cap')
      .with({ kind: 'fits-neither' }, () => 'over both caps')
      .exhaustive();
  }

  onDestroy(() => bench.dispose());
</script>

<DocsDemo label="Decode an image and hold its pixels">
  <div class="row wrap items-center gap-2">
    <Button size="sm" disabled={bench.busy} onclick={() => void bench.decode('page')}>
      Sample page, 720 × 960 PNG
    </Button>
    <Button size="sm" disabled={bench.busy} onclick={() => void bench.decode('scan')}>
      Scan, {sizeFigure(SCAN.size)} JPEG
    </Button>
    <Button size="sm" disabled={bench.busy} onclick={() => void bench.decode('slice')}>
      Webtoon slice, {sizeFigure(SLICE.size)} JPEG
    </Button>
  </div>
  {#if statusText !== null}
    <p class="m-0 text-sm text-muted" aria-live="polite">{statusText}</p>
  {/if}
  {#if bench.status.kind === 'failed'}
    <Alert variant="danger" title="The decode failed">{bench.status.message}</Alert>
  {/if}
  {#if bench.decoded.length > 0}
    <p class="row wrap items-center gap-2 m-0 text-sm">
      <span>Decoded pixels this page holds now</span>
      <Badge variant={bench.heldBytes > 0 ? 'warning' : 'success'}>
        {spaceFigure(bench.heldBytes)}
      </Badge>
      <Button size="sm" variant="ghost" onclick={() => bench.closeAll()}>Close all</Button>
    </p>
    <Table size="sm">
      <TableHeader>
        <TableRow>
          <TableHeaderCell>Image</TableHeaderCell>
          <TableHeaderCell>File</TableHeaderCell>
          <TableHeaderCell>Decode</TableHeaderCell>
          <TableHeaderCell>Memory</TableHeaderCell>
          <TableHeaderCell>iOS canvas</TableHeaderCell>
          <TableHeaderCell>Bitmap</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each bench.decoded as entry (entry.id)}
          <TableRow>
            <TableCell>
              <span class="col gap-0">
                <span>{SAMPLE_LABELS[entry.sample]}</span>
                <span class="text-muted text-xs">{sizeFigure(entry.size)}</span>
              </span>
            </TableCell>
            <TableCell>{spaceFigure(entry.encodedBytes)}</TableCell>
            <TableCell>{durationText(entry.decodeMs)}</TableCell>
            <TableCell>{decodedFigure(entry.size)}</TableCell>
            <TableCell>{fitText(entry.size)}</TableCell>
            <TableCell>
              {#if entry.closedSize === null}
                <Button size="sm" variant="ghost" onclick={() => bench.close(entry.id)}>
                  close()
                </Button>
              {:else}
                <span class="text-muted">closed, now {sizeFigure(entry.closedSize)}</span>
              {/if}
            </TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
  {/if}
  {#snippet caption()}
    Memory is width × height × 4 bytes. Each button decodes with <code>decodeImage</code> from
    <code>platform/image/decode.ts</code>, the function Dokseo uses to crop a page and draw a cover.
    The scan and the slice are drawn on an
    <code>OffscreenCanvas</code> and encoded as JPEG the first time, so only the decode is timed. Nothing
    leaves this page.
  {/snippet}
</DocsDemo>
