<script lang="ts">
  import { byteRows } from '../../../domain/byte-rows';
  import { FIRST_EDITION, sampleEpub, sampleEpubEntries } from '../../../domain/sample-epub';
  import DocsDemo from '../../DocsDemo.svelte';

  const BYTES_SHOWN = 64;

  const ROW_WIDTH = 16;

  const archive = sampleEpub(FIRST_EDITION);
  const entries = sampleEpubEntries(FIRST_EDITION);
  const rows = byteRows(archive, BYTES_SHOWN, ROW_WIDTH);
</script>

<DocsDemo label="The sample EPUB, byte by byte">
  {#snippet caption()}
    Built in this page by <code>sampleEpub</code>, which writes a ZIP with every entry stored
    uncompressed: {archive.length} bytes in all. The local header of the first entry ends at byte 30,
    and its name and contents follow it.
  {/snippet}
  <div class="stack-md">
    <ol class="list-reset stack-sm text-sm">
      {#each entries as entry (entry.path)}
        <li class="row wrap gap-2">
          <code>{entry.path}</code>
          <span class="text-muted">{entry.bytes.length} bytes</span>
        </li>
      {/each}
    </ol>
    <pre class="byte-row text-sm m-0" aria-label="The first {BYTES_SHOWN} bytes of the file"><code
        >{#each rows as row (row.offset)}{row.offset.toString().padStart(2, '0')}  {row.hex.padEnd(
            ROW_WIDTH * 3 - 1,
          )}  {row.text}{'\n'}{/each}</code
      ></pre>
  </div>
</DocsDemo>
