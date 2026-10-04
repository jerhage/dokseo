<script lang="ts">
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import { partialMd5Offsets } from '$lib/platform/crypto/partial-md5';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import HashDemo from './HashDemo.svelte';
  import { byteCount } from './identity-text';
  import { PLAUSIBLE_TITLE } from './identity-snippets';
  import { IDENTITY_SECTIONS, identityHref } from './sections';
  import TitleDemo from './TitleDemo.svelte';

  const KOREADER_LOOP = `local step, size = 1024, 1024
local update = md5()
for i = -1, 10 do
    file:seek("set", lshift(step, 2*i))
    local sample = file:read(size)
    if sample then
        update(sample)
    else
        break
    end
end`;

  const offsets = partialMd5Offsets();
</script>

<DocsSection title={IDENTITY_SECTIONS.same}>
  <p>
    Dokseo keeps everything about a book under one id: the stored file, the reading place, and every
    capture. A capture is a region of a page the reader ran OCR on, with its text, and it records
    the id of its book. So each time a file arrives, Dokseo has to answer one question before it
    stores anything: is this a book it already holds?
  </p>
  <p>Both wrong answers cost something. Take a reader who does this:</p>
  <ol>
    <li>Uploads <code>Akira_v01.pdf</code> and makes forty captures.</li>
    <li>Removes the book to free space.</li>
    <li>Uploads the same file a month later.</li>
  </ol>
  <p>
    If the upload counts as a new book, it gets a new id, and the forty captures stay attached to an
    id nothing uses. If instead two different books count as one, the second upload is turned away
    as already in the library, and there is no way to add it.
  </p>
  <p>
    The same question comes back in other forms: the PDF renamed, copied to a phone, the ZIP
    repacked by another tool, the folder of scans with one page fixed.
  </p>
</DocsSection>

<DocsSection title={IDENTITY_SECTIONS.path}>
  <p>
    A program that reads books from a disk can name a book by its path, such as
    <code>/Books/Akira/Akira_v01.pdf</code>. A path costs nothing to get and is unique on that disk.
    It breaks when the file is moved or renamed, and it means nothing on a second device.
  </p>
  <p>
    A web page cannot use a path at all. A file the reader picks arrives as a <code>File</code>
    whose <code>name</code> holds no folders. MDN says it plainly: "For security reasons, the path
    is excluded from this property." A folder picked through an input with the
    <code>webkitdirectory</code> attribute gives each file a <code>webkitRelativePath</code>, which
    starts at the chosen folder and goes no higher.
  </p>
  <p>
    The other way is to name a book by its content. A hash function turns any number of bytes into a
    short value of fixed length, and changing the bytes changes the value. Two copies of one file
    have the same hash wherever they are and whatever they are called.
  </p>
  <Table size="sm" caption="Two ways to say which book a file is">
    <TableHeader>
      <TableRow>
        <TableHeaderCell></TableHeaderCell>
        <TableHeaderCell>By path</TableHeaderCell>
        <TableHeaderCell>By content</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableHeaderCell scope="row">The file is renamed</TableHeaderCell>
        <TableCell>A new book</TableCell>
        <TableCell>The same book</TableCell>
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row">Copied to another device</TableHeaderCell>
        <TableCell>A new book</TableCell>
        <TableCell>The same book</TableCell>
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row">Saved again with new bytes</TableHeaderCell>
        <TableCell>The same book</TableCell>
        <TableCell>A new book</TableCell>
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row">Cost</TableHeaderCell>
        <TableCell>None</TableCell>
        <TableCell>Reading the file</TableCell>
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row">Available in a browser</TableHeaderCell>
        <TableCell>No</TableCell>
        <TableCell>Yes</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</DocsSection>

<DocsSection title={IDENTITY_SECTIONS.sampling}>
  <p>
    A hash of every byte has to read every byte. For a scanned volume of 600 MB that is 600 MB of
    reading on each upload, before anything else happens. In a browser it is worse. The built-in
    hash, <code>crypto.subtle.digest</code>, takes its whole input in one call; MDN notes that "you
    must read the entire input into memory before passing it into the digest function". It also has
    no MD5: its algorithms are SHA-1, SHA-256, SHA-384 and SHA-512.
  </p>
  <p>
    Sampling reads a few small pieces at fixed offsets and hashes only those, so the cost stops
    growing with the file. The price is what the samples miss: two files that agree on every sampled
    byte get the same hash, whatever lies between the samples. That is a fair trade for "is this a
    file I already imported", because the files in question are usually copies, and a copy agrees
    everywhere. It is the wrong tool for "are these bytes identical", such as checking a download.
  </p>
</DocsSection>

<DocsSection title={IDENTITY_SECTIONS.partial}>
  <p>
    KOReader, an open-source reader for e-ink devices, identifies a book by what it calls a partial
    MD5. This is the loop in <code>util.partialMD5</code>, in its <code>frontend/util.lua</code>:
  </p>
  <DocsCode label="KOReader, frontend/util.lua" code={KOREADER_LOOP} />
  <p>
    For each <code>i</code> from -1 to 10, it seeks to <code>lshift(1024, 2*i)</code>, reads up to
    1024 bytes, and feeds the sample into one running MD5. A read at or past the end returns nothing
    and stops the loop. Each offset is four times the one before, so the samples crowd the start of
    the file and thin out toward the end, and the last one is at 1 GiB. A file of any size costs at
    most twelve reads of 1 KiB.
  </p>
  <p>
    The first offset is a surprise. As arithmetic, 1024 times 2<sup>-2</sup> is 256. But
    <code>lshift</code> is LuaJIT's <code>bit.lshift</code>, a 32-bit shift, and the LuaJIT BitOp
    reference says "only the lower 5 bits of the shift count are used". The count -2 ends in the
    bits <code>11110</code>, which is 30, and 1024 shifted left by 30 is 2<sup>40</sup>. That one
    set bit lies outside the 32 bits kept, so the result is 0, and the first sample is the start of
    the file.
  </p>
  <Table size="sm" caption="The twelve offsets">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>i</TableHeaderCell>
        <TableHeaderCell>Offset in bytes</TableHeaderCell>
        <TableHeaderCell>Size</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each offsets as offset, index (offset)}
        <TableRow>
          <TableCell>{index - 1}</TableCell>
          <TableCell>{offset.toLocaleString('en-US')}</TableCell>
          <TableCell>{byteCount(offset)}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    The comment above KOReader's function gives the reason for weighting the head: KOReader can save
    highlights into a PDF by appending data to the end of the file, and samples near the head rarely
    see the appended bytes, so the hash usually survives. The same comment warns that a PDF whose
    size is close to one of the offsets can still change its hash this way.
  </p>
  <p>The gaps between samples are what the hash cannot see:</p>
  <ul>
    <li>
      A file of 300,000 bytes and a file of 1,048,576 bytes that agree on their first 263,168 bytes.
      Both read the six samples from 0 to 262,144, and neither has a byte at 1,048,576, so their
      partial MD5s are equal.
    </li>
    <li>
      A 10 MB file with byte 2,000,000 changed keeps its hash, because no sample covers that byte.
      Change byte 1,000 instead and the hash changes.
    </li>
  </ul>
  <p>
    KOReader's progress sync plugin, kosync, sends this value as the key of the document. Its
    "Document matching method" setting offers "Binary. Only identical files will be kept in sync."
    and "Filename. Files with matching names will be kept in sync."; the filename method keys a book
    by the MD5 of its file name instead.
  </p>
  <HashDemo />
</DocsSection>

<DocsSection title={IDENTITY_SECTIONS.names}>
  <p>
    When the hash differs, the reader may still mean the same book: a fresh scan, a ZIP repacked by
    another tool, a PDF saved again. The file name and the title are what is left, and both are
    weaker keys.
  </p>
  <p>
    A file name survives copying but not renaming, and different books share names all the time. Two
    series each have a <code>volume_01.cbz</code>; a scanner names every scan
    <code>scan.pdf</code>. Matching by name alone would merge them.
  </p>
  <p>
    A title is the name a person recognizes. It comes from the file name without its extension, or
    from metadata inside the file. It survives renaming the file, and collides the same way: two
    different books both called "Volume 1". A title is also only as good as its source.
  </p>
</DocsSection>

<DocsSection title={IDENTITY_SECTIONS.metadata}>
  <p>
    An EPUB declares its metadata in Dublin Core elements in its package document, and the EPUB
    specification requires a <code>dc:title</code> there. A PDF can hold a
    <code>Title</code> in its document information dictionary and a <code>dc:title</code> in its XMP metadata,
    both optional. A ZIP or CBZ of images has neither, and Dokseo reads no metadata from one.
  </p>
  <p>
    Metadata titles are often junk, because the tool that made the file filled them in. A PDF
    printed from a word processor can be titled <code>Microsoft Word - chapter01.doc</code>; others
    hold the path of the source document, or <code>Untitled</code>. A title like that is worse than
    the file name, and two unrelated books both titled <code>Untitled</code> would match each other. Dokseo
    screens a metadata title before using it, and falls back to the file title:
  </p>
  <DocsCode label={PLAUSIBLE_TITLE.file} code={PLAUSIBLE_TITLE.code} />
  <p>
    The check is a guess about leftovers from authoring tools, so it errs toward real titles:
    <code>Untitled Goose: A History</code> passes, because only a title that is exactly a
    placeholder fails. A book whose metadata title is rejected is titled from its file name, and
    <a href={identityHref('record')}>its row keeps that title</a> for good.
  </p>
  <TitleDemo />
</DocsSection>
