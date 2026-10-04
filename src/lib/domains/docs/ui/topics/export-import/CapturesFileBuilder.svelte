<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Checkbox from '$lib/components/Checkbox.svelte';
  import CodeBlock from '$lib/components/CodeBlock.svelte';
  import Input from '$lib/components/Input.svelte';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import TagToggle from '$lib/components/TagToggle.svelte';
  import { APP_VERSION } from '$lib/shared/app-version';
  import type { CaptureId } from '$lib/shared/ids';
  import { buildCapturesFile } from '$lib/domains/storage/use-cases/build-captures-file';
  import {
    LANTERNS,
    SAMPLE_HOLDINGS,
    SAMPLE_START,
    bookTitle,
    hasOrphan,
    isRemoved,
    sampleTime,
    withBookRemoved,
    withOrphan,
    withTagToggled,
    withText,
  } from './sample-holdings';

  let holdings = $state.raw(SAMPLE_HOLDINGS);
  let minute = $state(60);

  const built = $derived(
    buildCapturesFile({ ...holdings, exportedAt: SAMPLE_START, appVersion: APP_VERSION }),
  );
  const shown = $derived(JSON.stringify(built.file, null, 2));
  const bytes = $derived(new TextEncoder().encode(built.json).length);
  const keyed = $derived(
    built.file.books.map((book) => {
      const device =
        holdings.books.find((held) => held.contentHash === book.contentHash) ??
        holdings.removedBooks.find((held) => held.contentHash === book.contentHash);
      return { key: book.key, title: book.title, deviceId: device?.id ?? '' };
    }),
  );

  function edit(id: CaptureId, text: string): void {
    minute += 1;
    holdings = withText(holdings, id, text, sampleTime(minute));
  }
</script>

<div class="stack-md">
  <ul class="list-reset col gap-3">
    {#each holdings.captures as capture (capture.id)}
      <li class="col gap-2">
        <span class="text-xs text-muted">
          {bookTitle(holdings, capture.bookId) ?? 'A book this device no longer has'}
          {#if capture.editedAt !== null}· edited{/if}
        </span>
        <Input
          value={capture.text}
          lang="ja"
          aria-label="Capture text"
          onchange={(event) => edit(capture.id, event.currentTarget.value)}
        />
        <div class="row wrap items-center gap-2">
          {#each holdings.tags as tag (tag.id)}
            <TagToggle
              color={tag.colour}
              pressed={capture.tagIds.includes(tag.id)}
              onpressedchange={() => (holdings = withTagToggled(holdings, capture.id, tag.id))}
            >
              {tag.name}
            </TagToggle>
          {/each}
        </div>
      </li>
    {/each}
  </ul>
  <div class="col gap-2">
    <Checkbox
      checked={isRemoved(holdings, LANTERNS.id)}
      onchange={(event) =>
        (holdings = withBookRemoved(holdings, LANTERNS.id, event.currentTarget.checked))}
    >
      Remove {LANTERNS.title} from the library, keeping its captures
    </Checkbox>
    <Checkbox
      checked={hasOrphan(holdings)}
      onchange={(event) => (holdings = withOrphan(holdings, event.currentTarget.checked))}
    >
      Add a capture whose book this device no longer has
    </Checkbox>
  </div>

  <Table size="sm">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Book</TableHeaderCell>
        <TableHeaderCell>Id here</TableHeaderCell>
        <TableHeaderCell>In the file</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each keyed as row (row.key)}
        <TableRow>
          <TableCell>{row.title}</TableCell>
          <TableCell><code>{row.deviceId.slice(0, 8)}…</code></TableCell>
          <TableCell><code>{row.key}</code></TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>

  <p class="row wrap items-center gap-2 m-0 text-sm">
    <Badge>{built.file.captures.length} captures</Badge>
    <Badge>{bytes.toLocaleString()} bytes</Badge>
    {#if built.bookless.length > 0}
      <Badge variant="warning">{built.bookless.length} left out: no book</Badge>
    {/if}
  </p>
  <CodeBlock code={shown} label="The file, indented for reading" />
</div>
