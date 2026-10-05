<script lang="ts">
  import { match } from 'ts-pattern';
  import Badge from '$lib/ui/components/Badge.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Dropzone from '$lib/ui/components/Dropzone.svelte';
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import { partialMd5 } from '$lib/platform/crypto/partial-md5';
  import DocsCode from '../../DocsCode.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import { hashUpload } from './file-hashes.svelte';
  import type { Digest, HashFiles, HashedUpload } from './file-hashes.svelte';
  import { bytesSampled, sampleSpans } from './identity-demos';
  import { byteCount, elapsed } from './identity-text';
  import SampleBar from './SampleBar.svelte';

  function hex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join(
      '',
    );
  }

  const hashers: HashFiles = {
    partial: partialMd5,
    whole: async (blob) => hex(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())),
    now: () => performance.now(),
  };

  let uploads = $state.raw<readonly HashedUpload<File>[]>([]);
  let dropzone = $state<ReturnType<typeof Dropzone> | null>(null);

  function digestText(digest: Digest): string {
    return match(digest)
      .with({ kind: 'done' }, ({ hash, ms }) => `${hash} in ${elapsed(ms)}`)
      .with({ kind: 'failed' }, ({ message }) => `Could not be read: ${message}`)
      .with({ kind: 'idle' }, { kind: 'running' }, () => 'Hashing…')
      .exhaustive();
  }
</script>

<DocsDemo label="Hash a file">
  {#snippet caption()}
    The hash is the real <code>partialMd5</code>, and a folder's manifest comes from the real
    <code>splitUpload</code>, <code>fingerprintedFiles</code> and <code>uploadManifest</code>. The
    files stay in this tab: nothing is stored or sent.
  {/snippet}
  <div class="stack-md">
    <Dropzone
      bind:this={dropzone}
      size="sm"
      multiple
      directory
      title="Drop a book here or browse"
      hint="A PDF, EPUB, ZIP or CBZ, or several page images"
      onfiles={(selection) => (uploads = hashUpload(selection.accepted, hashers))}
    />
    <div class="row wrap gap-2">
      <Button size="sm" variant="outline" onclick={() => dropzone?.chooseDirectory()}
        >Choose a folder of pages</Button
      >
    </div>
    {#each uploads as upload, index (index)}
      {@const book = upload.book}
      <div class="stack-sm bordered rounded-container p-3 min-w-0">
        <p class="m-0 row wrap items-center gap-2">
          <strong class="truncate"
            >{book.fileName.length > 0 ? book.fileName : 'Loose files'}</strong
          >
          <Badge variant={book.part.kind === 'file' ? 'primary' : 'accent'}
            >{book.part.kind === 'file' ? 'one file' : 'a folder manifest'}</Badge
          >
        </p>
        <p class="m-0 text-sm text-muted">Partial MD5</p>
        <p class="m-0 mono text-sm">{digestText(upload.partial)}</p>
        {#if book.part.kind === 'file'}
          {@const size = book.part.file.size}
          <p class="m-0 text-sm">
            Read {byteCount(bytesSampled(size))} of {byteCount(size)}, in {sampleSpans(size).filter(
              (span) => span.kind === 'read',
            ).length} samples.
          </p>
          <SampleBar {size} />
          <Table size="sm" caption="The twelve offsets for this file">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Offset</TableHeaderCell>
                <TableHeaderCell>Bytes read</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {#each sampleSpans(size) as span (span.offset)}
                <TableRow>
                  <TableCell>{span.offset.toLocaleString('en-US')}</TableCell>
                  <TableCell
                    >{span.kind === 'read'
                      ? span.length.toLocaleString('en-US')
                      : 'past the end, the loop stops'}</TableCell
                  >
                </TableRow>
              {/each}
            </TableBody>
          </Table>
          <div class="stack-sm">
            <div class="row wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                loading={upload.whole.kind === 'running'}
                onclick={() => void upload.hashEveryByte()}
              >
                Compare: SHA-256 of all {byteCount(size)}
              </Button>
            </div>
            <p class="m-0 text-xs text-muted">
              This reads the whole file into memory at once, because
              <code>crypto.subtle.digest</code> takes one buffer.
            </p>
            {#if upload.whole.kind !== 'idle'}
              <p class="m-0 mono text-sm">{digestText(upload.whole)}</p>
            {/if}
          </div>
        {:else}
          <p class="m-0 text-sm">
            {book.part.kept.length} page images. The hash covers this text, not the image bytes:
          </p>
          <DocsCode label="Manifest" code={book.part.manifest} />
        {/if}
        {#if book.ignored.length > 0}
          <p class="m-0 text-sm text-muted">
            Not hashed: {book.ignored.map((file) => file.name).join(', ')}
          </p>
        {/if}
      </div>
    {/each}
  </div>
</DocsDemo>
