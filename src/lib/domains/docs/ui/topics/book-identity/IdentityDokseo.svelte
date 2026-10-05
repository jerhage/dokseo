<script lang="ts">
  import Diagram from '$lib/ui/components/Diagram.svelte';
  import Figure from '$lib/ui/components/Figure.svelte';
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { MATCHING_LADDER } from './identity-diagrams';
  import {
    HASHED_PART,
    JOIN_UPLOAD,
    MATCHING_OPTIONS,
    MATCH_STEPS,
    OPEN_FILE_JOIN,
    OPEN_FILE_RESTORE,
    PARTIAL_MD5,
    RESTORABLE_MATCH,
    SHOWN_TITLE,
    UPLOAD_MANIFEST,
    UPLOAD_NAME,
  } from './identity-snippets';
  import MatcherDemo from './MatcherDemo.svelte';
  import { IDENTITY_SECTIONS, identityHref } from './sections';

  const CONFORMANCE: readonly { readonly size: string; readonly hash: string }[] = [
    { size: '0', hash: 'd41d8cd98f00b204e9800998ecf8427e' },
    { size: '5,000', hash: 'e9b23960f33568cd50442e8f305853c3' },
    { size: '300,000', hash: '3d87fe2dd28ddc7895ae5e290bfa539e' },
    { size: '1,048,576', hash: '3d87fe2dd28ddc7895ae5e290bfa539e' },
    { size: '1,048,577', hash: '786211a95054ac0cec32c0535d32846b' },
  ];
</script>

<DocsSection title={IDENTITY_SECTIONS.hash}>
  <p>
    Dokseo's book hash is KOReader's partial MD5, value for value, so a file has the same hash in
    both apps. That is the key a future sync with KOReader would need. Two files in
    <code>src/lib/platform/crypto/</code> build it: <code>md5.ts</code>, a small incremental MD5 in
    plain TypeScript, because Web Crypto has none, and <code>partial-md5.ts</code>:
  </p>
  <DocsCode label={PARTIAL_MD5.file} code={PARTIAL_MD5.code} />
  <p>
    <code>luajitLeftShift</code> is a plain <code>&lt;&lt;</code>. JavaScript's left shift also uses
    only the low five bits of its count and keeps 32 bits, so <code>1024 &lt;&lt; -2</code> is 0, as
    in LuaJIT. The function has a name so that a test can pin that, and so that nobody rewrites the
    offsets as <code>1024 * 4 ** i</code>, which starts at 256 and gives a different hash from
    KOReader's for almost every file.
  </p>
  <p>
    <code>blob.slice()</code> makes a <code>Blob</code> for one range, and
    <code>arrayBuffer()</code> reads it, so only the sampled bytes are ever loaded into memory. The
    offsets only grow, so the first one at or past the end ends the loop, as the Lua
    <code>break</code> does. The tests check the result against values that KOReader's own loop produced
    under LuaJIT:
  </p>
  <Table size="sm" caption="Files whose byte i is (31i + 7) mod 251">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Bytes</TableHeaderCell>
        <TableHeaderCell>Partial MD5</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each CONFORMANCE as row (row.size)}
        <TableRow>
          <TableCell>{row.size}</TableCell>
          <TableCell><code>{row.hash}</code></TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    The empty file hashes nothing and gives the MD5 of no input. The rows for 300,000 and 1,048,576
    bytes share a hash, as the gap example above predicts, and one more byte at 1,048,577 reaches
    the seventh sample and changes it.
  </p>
</DocsSection>

<DocsSection title={IDENTITY_SECTIONS.folder}>
  <p>
    A folder of page images has no single file to hash, and hashing every image would read the whole
    book again. Dokseo hashes a description of the folder instead: one line per page image with its
    name and size in bytes, sorted, joined with newlines. The partial MD5 of that text is the book's
    hash.
  </p>
  <DocsCode label={HASHED_PART.file} code={HASHED_PART.code} />
  <DocsCode label={UPLOAD_MANIFEST.file} code={UPLOAD_MANIFEST.code} />
  <p>
    Before that, <code>fingerprintedFiles</code> keeps only the files that count as page images, so
    a
    <code>.DS_Store</code> that Finder rewrote, a <code>Thumbs.db</code> or a
    <code>notes.txt</code> leaves the hash alone. A lone file, whether a PDF, an EPUB, a ZIP or a single
    image, is hashed itself. What follows for a folder:
  </p>
  <ul>
    <li>
      Renaming the folder or moving it keeps the hash: the folder's name is not in the manifest.
    </li>
    <li>Renaming, adding or removing a page changes it.</li>
    <li>Replacing a page with a different image of the same name and the same size keeps it.</li>
  </ul>
  <p>
    The <a href={identityHref('partial')}>demo above</a> shows the manifest when you choose a folder or
    several images.
  </p>
</DocsSection>

<DocsSection title={IDENTITY_SECTIONS.record}>
  <p>
    A book row in IndexedDB holds the fields recovery can match on, beside everything else about the
    book. How the row itself is stored, and how it survives eviction, is on
    <a href="/docs/storage">Storage that lasts</a>.
  </p>
  <Table size="sm" caption="The identity fields of a book">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Field</TableHeaderCell>
        <TableHeaderCell>Holds</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableHeaderCell scope="row"><code>id</code></TableHeaderCell>
        <TableCell
          >A random UUID from <code>crypto.randomUUID()</code>. Each capture stores it, and it never
          changes.</TableCell
        >
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row"><code>contentHash</code></TableHeaderCell>
        <TableCell>The partial MD5 of the file, or of the folder's manifest.</TableCell>
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row"><code>fileName</code></TableHeaderCell>
        <TableCell
          >The file's own name with its extension, or the folder's name. Empty for loose files that
          share no folder.</TableCell
        >
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row"><code>title</code></TableHeaderCell>
        <TableCell
          >Set once at upload: the metadata title if it passes <code>plausibleTitle</code>, else the
          file title. Never edited.</TableCell
        >
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row"><code>alias</code></TableHeaderCell>
        <TableCell>The reader's own name for the book, or <code>null</code>.</TableCell>
      </TableRow>
    </TableBody>
  </Table>
  <DocsCode label={UPLOAD_NAME.file} code={UPLOAD_NAME.code} />
  <p>
    The name is normalized to NFC, Unicode's composed form. The same visible name can arrive as one
    precomposed character, such as <code>é</code>, or as a base letter followed by a combining
    accent, and the two strings compare unequal until they are normalized.
  </p>
  <p>
    Renaming a book in Dokseo writes the alias and leaves the title alone. Where a book is named,
    Dokseo shows <code>alias ?? title</code>:
  </p>
  <DocsCode label={SHOWN_TITLE.file} code={SHOWN_TITLE.code} />
  <p>
    The title is one of the keys recovery matches on. If a rename overwrote it, a book renamed
    "Akira (my scan)" and then removed could no longer be found by the title its file produces. With
    the alias apart, the screens show the reader's name and matching uses the original. Typing the
    original title back, or clearing the field, sets the alias to <code>null</code>.
  </p>
</DocsSection>

<DocsSection title={IDENTITY_SECTIONS.ladder}>
  <p>
    <code>openFile</code>, the use case behind every upload, compares the upload with what the
    browser holds in two stages. The first looks only at books on the shelf; the second, only when
    the first found nothing, looks at removed books and unreadable rows, both described further
    down.
  </p>
  <Figure>
    <Diagram {...MATCHING_LADDER} />
    {#snippet caption()}
      The matching ladder. The shelf stage compares books on the shelf; the restore stage compares
      unreadable rows, then removed records. Each stage stops at its first match.
    {/snippet}
  </Figure>
  <p>The first stage is <code>joinUpload</code>:</p>
  <DocsCode label={JOIN_UPLOAD.file} code={JOIN_UPLOAD.code} />
  <p>
    The hash always comes first. A file name joins a shelf book only when the
    <a href={identityHref('setting')}>Match books by</a> setting is File name, and a title never
    does. A join stores nothing new: the shelf book keeps its file, hash and id, and the upload
    reports <code>already-held</code>. On the way, <code>mergeStrays</code> folds in any unreadable
    row that matches the book, which <a href={identityHref('merge')}>a later section</a> explains.
  </p>
  <DocsCode label="{OPEN_FILE_JOIN.file}, the join" code={OPEN_FILE_JOIN.code} />
  <p>
    When nothing on the shelf matched, <code>openFile</code> builds the book first: it reads the pages,
    the cover and the metadata title. Only then does it run the second stage, because the title step needs
    that title. The three steps are:
  </p>
  <DocsCode label={MATCH_STEPS.file} code={MATCH_STEPS.code} />
  <DocsCode label={RESTORABLE_MATCH.file} code={RESTORABLE_MATCH.code} />
  <ul>
    <li>
      The steps are the outer loop and the candidates the inner one. A hash match on any candidate
      beats a file name match on another.
    </li>
    <li>
      Within a step, unreadable rows come before removed records, and the most recently added comes
      first in each.
    </li>
    <li>
      An empty hash or file name never matches. Titles are compared after NFC and trimming, and the
      placeholder <code>Untitled book</code> never matches.
    </li>
    <li>
      The title step compares the stored original title, never the alias, with both the upload's
      chosen title and its file title. A row titled from its file name before Dokseo read metadata
      titles still matches an upload that now has a metadata title.
    </li>
    <li>This stage ignores the Match books by setting.</li>
  </ul>
  <p>A match hands its id, its alias, and its series id and volume to the new book:</p>
  <DocsCode label="{OPEN_FILE_RESTORE.file}, the restore" code={OPEN_FILE_RESTORE.code} />
  <p>
    The title step has a known cost. Two different books with the same title, where neither the hash
    nor the file name matches, restore into each other. Say a removed record is titled
    <code>Volume 1</code> from one series, and a reader uploads <code>Volume 1.pdf</code> from another:
    the new book takes the old id, and the old book's captures appear on it.
  </p>
  <p>
    Importing a captures file uses the same functions, <code>shelfMatch</code> and
    <code>restorableMatch</code>, to find each book of the file on this device; the
    <a href="/docs/export-import">export and import</a> page covers that.
  </p>
</DocsSection>

<DocsSection title={IDENTITY_SECTIONS.setting}>
  <p>
    Settings › Library has a Match books by choice that mirrors kosync's matching method. It is kept
    in <code>localStorage</code> under <code>reader.library.matching</code>, and any value other
    than
    <code>file-name</code> reads as <code>content</code>.
  </p>
  <DocsCode label={MATCHING_OPTIONS.file} code={MATCHING_OPTIONS.code} />
  <p>
    It changes only the first stage. File name joins a shelf book even when a new copy of the file
    differs in a sampled byte, which helps when file names are stable and unique. With generic names
    such as <code>scan.pdf</code>, it joins the wrong book, and the upload is turned away.
  </p>
</DocsSection>

<DocsSection title={IDENTITY_SECTIONS.playground}>
  <p>
    The rows below stand for what a browser holds. Pick an upload, or type one, and watch which step
    answers. Two to try: "Yotsuba 01.cbz, re-zipped" with Content, which restores the unreadable row
    by its title and leaves two shelf books named <code>Yotsuba 01</code>, then the same upload with
    File name, which joins the shelf book and merges the row instead.
  </p>
  <MatcherDemo />
</DocsSection>
