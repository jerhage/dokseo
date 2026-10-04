<script lang="ts">
  import Diagram from '$lib/components/Diagram.svelte';
  import Figure from '$lib/components/Figure.svelte';
  import StepItem from '$lib/components/StepItem.svelte';
  import StepList from '$lib/components/StepList.svelte';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import ActivationProbe from './ActivationProbe.svelte';
  import { ROUND_TRIP } from './export-import-diagrams';
  import { EXPORT_IMPORT_SECTIONS } from './export-import-sections';

  const IDS = [
    {
      record: 'A capture',
      minted: 'When the text is captured',
      global: 'Yes. Every copy keeps the id it was born with.',
    },
    {
      record: 'A tag',
      minted: 'When the tag is created',
      global:
        'Once copied, yes. But two devices that each create "vocab" mint two ids for one name.',
    },
    {
      record: 'A book',
      minted: 'When the file is added to a library',
      global: 'No. The same file added on two devices gets two ids.',
    },
  ] as const;

  const VERSION_RULES = [
    { found: 'No format field, or another format', answer: 'Not this kind of file: reject.' },
    { found: 'A version this build can read', answer: 'Read it.' },
    {
      found: 'A whole number above that version',
      answer: 'Reject, and say the app needs an update. The file is fine.',
    },
    { found: 'Anything else', answer: 'Reject as not this kind of file.' },
  ] as const;
</script>

<DocsSection title={EXPORT_IMPORT_SECTIONS.problem}>
  <p>
    Dokseo keeps everything on the device: the books, the captures (the text recognized or typed on
    a page), and the tags on those captures. They live in IndexedDB and the origin private file
    system, which <a href="/docs/storage">Storage that lasts</a> describes, and there is no account and
    no server. Someone who captures on a phone during the commute and studies on a laptop at home still
    wants the same captures in both places.
  </p>
  <p>
    With no server in between, the only thing that can travel is a file the person moves: saved on
    one device, sent by AirDrop, a cloud folder or a cable, and opened on the other. That makes the
    file format the whole protocol. The other device must recognize what each record is, a file from
    an older or newer build must not be misread, and opening the same file twice, or an old copy,
    must not make a mess.
  </p>
  <Figure>
    <Diagram {...ROUND_TRIP} />
    {#snippet caption()}
      A round trip. The phone's id for a book becomes a key that only means something inside the
      file, and the laptop maps that key to its own id for the same book.
    {/snippet}
  </Figure>
</DocsSection>

<DocsSection title={EXPORT_IMPORT_SECTIONS.ids}>
  <p>
    Every stored record needs a key. An app with no server usually takes a random UUID from
    <code>crypto.randomUUID()</code>: a version 4 UUID has 122 random bits, so two devices can mint
    ids on their own and never collide in practice.
  </p>
  <p>
    Whether an id works on another device depends on when it was minted. A capture's id is minted
    once, when the capture is taken, and every copy of the capture keeps it. Export it, import it on
    another device, and the id still names the same capture. That is a global id.
  </p>
  <p>
    A book's id is minted when a file is added to a library. Add the same CBZ on the phone and on
    the laptop, and each device mints its own: one book, two ids. That is a local id. It names a row
    in one database and means nothing anywhere else.
  </p>
  <Table size="sm">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Record</TableHeaderCell>
        <TableHeaderCell>Id minted</TableHeaderCell>
        <TableHeaderCell>Same on every device?</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each IDS as row (row.record)}
        <TableRow>
          <TableCell>{row.record}</TableCell>
          <TableCell>{row.minted}</TableCell>
          <TableCell>{row.global}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
</DocsSection>

<DocsSection title={EXPORT_IMPORT_SECTIONS.identity}>
  <p>Writing a local id into a file fails like this:</p>
  <StepList>
    <StepItem title="The phone exports a capture">
      <p>
        The capture's <code>bookId</code> is <code>9a1c6f04…</code>, the phone's id for the book.
      </p>
    </StepItem>
    <StepItem title="The laptop reads the file">
      <p>
        On the laptop the same book is <code>2c84e1f6…</code>. No book there has the id
        <code>9a1c6f04…</code>.
      </p>
    </StepItem>
    <StepItem title="The import has two bad choices">
      <p>
        It drops the capture, or it writes the capture under an id that matches no book here, so the
        capture belongs to nothing on the shelf.
      </p>
    </StepItem>
  </StepList>
  <p>
    So the file has to describe each book by facts that both devices can work out on their own: a
    hash of the book file's content, the file's name, the title. The local id is replaced by a key
    that only means something inside the file, such as <code>book-1</code>, and every record in the
    file that belongs to the book refers to that key. On import, the device matches each key's
    description against its own books and uses its own id. A global id needs none of this, which is
    why capture ids go into the file as they are.
  </p>
</DocsSection>

<DocsSection title={EXPORT_IMPORT_SECTIONS.versions}>
  <p>
    A file outlives the build that wrote it. Someone exports today, updates the app twice, and
    imports next year; or a laptop still running an old build is given a file from a phone that has
    updated. So the first fields of the file say what it is and which version of the layout it
    follows, and a reader checks both before anything else:
  </p>
  <Table size="sm">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>The file has</TableHeaderCell>
        <TableHeaderCell>The reader</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each VERSION_RULES as row (row.found)}
        <TableRow>
          <TableCell>{row.found}</TableCell>
          <TableCell>{row.answer}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    Rejecting a newer version, rather than reading the fields that look familiar, matters because a
    new version can change what a field means, not only add fields. An old reader that applies its
    own rules to the new meaning stores something wrong, and nothing on screen says so. Raising the
    version number is how a writer says that old readers must stop.
  </p>
</DocsSection>

<DocsSection title={EXPORT_IMPORT_SECTIONS.strict}>
  <p>
    <code>JSON.parse</code> returns data of unknown type. Nothing guarantees that a field exists or holds
    the right kind of value: the file may have been edited by hand, cut short by a sync client, or written
    by a build with a bug. Reading it takes two separate decisions.
  </p>
  <p>
    The first is how strict to be about one field. An app reading its own database can sometimes
    fall back to a default: Dokseo reads an unknown language in a stored book row as Japanese, as
    <a href="/docs/storage#reading-a-stored-row-back">reading a stored row back</a> shows. An import should
    not guess. A guessed language or reading direction would be written into this device's database as
    if it were real, and nothing would mark it as a guess afterwards. So an import checks every field
    and rejects an entry with a bad one.
  </p>
  <p>
    The second is how much one bad entry costs. Rejection works per entry, not per file. A file of
    2,000 captures with one damaged entry imports 1,999 and names the one it skipped by its section
    and position. Failing the whole file would leave nothing imported, and the only fix would be to
    edit JSON by hand.
  </p>
  <p>
    Entries also depend on each other. A capture whose book entry was rejected has nowhere to go, so
    it is skipped with a reason of its own. A capture that names a tag the file does not hold loses
    that tag and keeps the rest.
  </p>
</DocsSection>

<DocsSection title={EXPORT_IMPORT_SECTIONS.merge}>
  <p>
    The device holds records and the file holds records. Matching them by global id puts each file
    record in one of a few cases: no record here has the id, so add it; a record here has the id and
    the same content, so do nothing; a record here has the id and different content, so update it,
    or treat it as a conflict, which the next section covers.
  </p>
  <p>
    That leaves a record on the device that the file lacks, and the rule that makes importing safe
    is to leave it alone. A file is a snapshot of one device at one moment, not a list of everything
    that should exist. A capture can be missing from it because it was taken after the export, or
    because the file holds a single book's captures. If missing meant deleted, importing an old file
    would erase newer work. Passing a deletion through a file would need a record of each deletion,
    often called a tombstone, and keeping those is a sync system's job.
  </p>
  <p>
    Matching by id also makes the import idempotent: importing a file twice leaves the device as
    importing it once does. The second time, every record in the file is already here with the same
    content, so nothing is written. The same property makes a retry safe after an import stopped
    halfway: the part already written matches, and the rest is written.
  </p>
</DocsSection>

<DocsSection title={EXPORT_IMPORT_SECTIONS.conflicts}>
  <p>
    A conflict is the same capture edited on both devices since they last exchanged a file. The
    phone changed the text at 9:05, the laptop changed it to something else at 9:07, and neither
    change is more of an update than the other. A rule has to pick, or a person does:
  </p>
  <ul>
    <li>
      <strong>Keep the newer edit.</strong> Compare when each side last changed: the edit time, or the
      creation time if it was never edited. Two times can be equal, so the rule also needs a tie rule
      that always picks the same side. The times come from two devices' clocks, so newer means newer by
      those clocks, which is right for one person with two devices whose clocks agree, and wrong when
      one clock is off.
    </li>
    <li>
      <strong>Keep this device's version.</strong> The file only adds what is new. Predictable, and the
      other device's edits are lost.
    </li>
    <li>
      <strong>Review each one.</strong> Show both versions, let the person pick one, or edit a third version
      by hand. The most work, and the only choice that can combine two edits.
    </li>
  </ul>
  <p>
    Some fields merge without a conflict. A set, such as a capture's tags, can be the union of both
    sides: if one device added "vocab" and the other "grammar", the result has both. A union cannot
    remove a tag that one side took off, the same trade as never deleting.
  </p>
</DocsSection>

<DocsSection title={EXPORT_IMPORT_SECTIONS.saving}>
  <p>
    A web page can hand a file over in two ways. The old one is a download: put the content in a
    <code>Blob</code>, make an object URL for it, and click an <code>&lt;a&gt;</code> element whose
    <code>download</code> attribute names the file. On a desktop the file lands in the downloads folder.
  </p>
  <p>
    The other is the Web Share API. <code>navigator.share({'{'} files: [file] {'}'})</code> opens
    the operating system's share sheet, which on an iPhone or iPad is where Save to Files and
    AirDrop are, and those are how a phone moves a file to another device.
    <code>navigator.canShare(data)</code>
    returns <code>false</code> when the data cannot be shared, including when the browser does not
    support sharing files. Which file types a browser accepts is up to the browser: MDN's list of
    commonly shareable types has no <code>.json</code>, and in Chrome I found <code>canShare</code>
    returns
    <code>false</code> for a <code>.json</code> file, while Safari on a Mac returns
    <code>true</code>.
  </p>
  <p>
    <code>share()</code> returns a promise. It rejects with an <code>AbortError</code> when the
    person closes the sheet or no target is available, with a <code>NotAllowedError</code> when the
    window has no transient activation (or a permissions policy or a security rule blocks it), and
    with a
    <code>TypeError</code> when the data is not valid, for example files on a browser that cannot share
    them.
  </p>
</DocsSection>

<DocsSection title={EXPORT_IMPORT_SECTIONS.activation}>
  <p>
    Some APIs only work right after a person interacts with the page, so a script cannot open a
    share sheet or a popup on its own. The HTML standard calls the state transient activation. A
    trusted <code>keydown</code> (other than Escape and reserved shortcuts), a
    <code>mousedown</code>, a <code>pointerdown</code> from a mouse, a <code>pointerup</code> from
    any other pointer, or a <code>touchend</code> starts it, and it lasts for the browser's
    transient activation duration, which the standard leaves to the browser and says should be at
    most a few seconds. <code>share()</code> rejects without it, and it consumes it: one tap buys one
    share.
  </p>
  <p>Dokseo's Export all captures runs like this:</p>
  <StepList>
    <StepItem title="Tap Export all captures">
      <p>The tap starts transient activation.</p>
    </StepItem>
    <StepItem title="Read the database">
      <p>
        The handler awaits IndexedDB for the books, the removed books, the tags and the captures.
      </p>
    </StepItem>
    <StepItem title="Build the file and call share()">
      <p>
        On an iPhone, I found that Safari rejected the call with <code>NotAllowedError</code>. The
        activation from the tap no longer counted.
      </p>
    </StepItem>
  </StepList>
  <p>
    The few seconds in the standard do not explain a loss after a short database read, and I did not
    find where WebKit ends it. What I found is that awaiting the reads before <code>share()</code>
    lost it, and calling <code>share()</code> before any await kept it. An async function runs
    synchronously until its first <code>await</code>, so a <code>share()</code> call placed before any
    await still runs inside the tap's handler.
  </p>
  <p>
    That leaves two ways out. Do the slow work before the tap, so the tap's handler only calls
    <code>share()</code>. Or accept the rejection, keep the built file, and ask for a second tap
    whose handler calls <code>share()</code> straight away. Dokseo uses both, in different places.
  </p>
  <ActivationProbe />
</DocsSection>
