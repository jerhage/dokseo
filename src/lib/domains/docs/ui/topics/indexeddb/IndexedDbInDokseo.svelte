<script lang="ts">
  import { BLOCKED_PATIENCE_MS } from '$lib/platform/idb/connection';
  import StepItem from '$lib/components/StepItem.svelte';
  import StepList from '$lib/components/StepList.svelte';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import {
    EXPORT_IDS_HREF,
    EXPORT_PROXY_HREF,
    IDENTITY_MERGE_HREF,
    INDEXEDDB_SECTIONS,
    STORAGE_DATABASES_HREF,
    indexedDbHref,
  } from './indexeddb-sections';
  import {
    BLOCKED_PATIENCE,
    DELETE_TAG,
    EXPORT_JOIN,
    LIST_BY_INDEX,
    MOVE_BOOK,
    RECOGNITION_UPGRADE,
    REWRITE_BY_INDEX,
    TRANSACT,
    VERSION_CHANGE,
  } from './indexeddb-snippets';

  const patienceSeconds = BLOCKED_PATIENCE_MS / 1000;

  const STORES = [
    { database: 'reader', version: 3, store: 'books', key: "keyPath 'id'", index: '' },
    { database: 'reader', version: 3, store: 'page-lists', key: "keyPath 'id'", index: '' },
    { database: 'reader', version: 3, store: 'removed-books', key: "keyPath 'id'", index: '' },
    {
      database: 'recognition',
      version: 5,
      store: 'model-consent',
      key: "keyPath 'language'",
      index: '',
    },
    {
      database: 'recognition',
      version: 5,
      store: 'captures',
      key: "keyPath 'id'",
      index: "bookId on 'bookId', not unique; tagIds on 'tagIds', multiEntry",
    },
    {
      database: 'recognition',
      version: 5,
      store: 'recognizer-setup',
      key: "keyPath 'language'",
      index: '',
    },
    { database: 'recognition', version: 5, store: 'tags', key: "keyPath 'id'", index: '' },
    {
      database: 'flowing',
      version: 1,
      store: 'reading-settings',
      key: "keyPath 'reader'",
      index: '',
    },
  ] as const;

  const HISTORY = [
    { database: 'reader', steps: '1 books · 2 page-lists · 3 removed-books' },
    {
      database: 'recognition',
      steps:
        '1 model-consent · 2 captures and its bookId index · 3 recognizer-setup · 4 tags · 5 the tagIds index',
    },
    { database: 'flowing', steps: '1 reading-settings' },
  ] as const;
</script>

<DocsSection title={INDEXEDDB_SECTIONS.databases}>
  <p>
    Dokseo keeps its records in three databases, one per domain that stores records, so a change to
    one domain's layout never bumps another's version.
    <a href={STORAGE_DATABASES_HREF}>Dokseo's three databases</a> says what each store holds; this table
    shows how each one is keyed and indexed.
  </p>
  <Table size="sm" caption="Every store and index, as the upgrade functions create them">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Database</TableHeaderCell>
        <TableHeaderCell>Store</TableHeaderCell>
        <TableHeaderCell>Key</TableHeaderCell>
        <TableHeaderCell>Index</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each STORES as row (row.store)}
        <TableRow>
          <TableCell><code>{row.database}</code> v{row.version}</TableCell>
          <TableCell><code>{row.store}</code></TableCell>
          <TableCell><code>{row.key}</code></TableCell>
          <TableCell>{row.index === '' ? 'none' : row.index}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    No store uses <code>autoIncrement</code>. Every key is minted by the code before the write: a
    book, a capture and a tag each get a random UUID from <code>crypto.randomUUID()</code>, the
    model consent and the recognizer setup are keyed by language, and the EPUB reading settings are
    one record whose <code>reader</code> field is always <code>'reader'</code>. A key that exists
    before the record is stored can go into another record, a URL or an export file, and
    <a href={EXPORT_IDS_HREF}>Local ids and global ids</a> explains why a capture's id must match on every
    device.
  </p>
  <p>
    There are two indexes in the whole app, both on <code>captures</code>, because two queries read
    by a field other than the key: a book's captures through <code>bookId</code>, and a tag's
    captures through <code>tagIds</code>, a <code>multiEntry</code> index with one entry per id in
    the array. An index added to a store that already exists needs that store from the upgrade's own
    transaction, which is why <code>upgrade</code> receives it. Each database's name, version, store
    names and upgrade live in one place: the library repository itself for
    <code>reader</code>, and <code>recognition-database.ts</code> and
    <code>flowing-database.ts</code> for the other two, which several adapters share.
  </p>
  <DocsCode label={RECOGNITION_UPGRADE.label} code={RECOGNITION_UPGRADE.code} />
</DocsSection>

<DocsSection title={INDEXEDDB_SECTIONS.helpers}>
  <p>
    No adapter calls <code>db.transaction</code> itself. They all go through
    <code>src/lib/platform/idb/connection.ts</code>, which exports seven helpers:
    <code>getRecord</code>, <code>putRecord</code>, <code>deleteRecord</code>,
    <code>listRecords</code>, <code>listByIndex</code>, <code>deleteByIndex</code> and
    <code>rewriteByIndex</code>. Each one opens one transaction on one store, places its requests,
    and resolves when the transaction fires <code>complete</code>, not when the request succeeds, so
    a write that resolved is committed.
  </p>
  <DocsCode label={TRANSACT.label} code={TRANSACT.code} />
  <DocsCode label={LIST_BY_INDEX.label} code={LIST_BY_INDEX.code} />
  <p>
    The cost of that design is that an operation built from several helper calls is several
    transactions. Removing a book in the library repository reads the book row, writes a
    <code>removed-books</code> record, deletes the book row and deletes its page list: up to four
    transactions in sequence, so a failure after the second leaves the first two committed. A merge
    of captures from one book into another spans two databases, and a transaction never spans two
    databases, which is why the merge use case has a <code>partly-merged</code> result.
  </p>
</DocsSection>

<DocsSection title={INDEXEDDB_SECTIONS.move}>
  <p>
    Moving every capture of one book onto another is <code
      >UPDATE captures SET bookId = to WHERE bookId = from</code
    >. IndexedDB has no update by condition, so <code>rewriteByIndex</code> reads the matching records
    through the index and puts each rewritten record back:
  </p>
  <DocsCode label={REWRITE_BY_INDEX.label} code={REWRITE_BY_INDEX.code} />
  <p>
    The puts are placed inside the <code>getAll</code> request's <code>success</code> handler, where
    the transaction is active again, so the read and every write share one transaction. Since
    <code>transact</code> resolves on <code>complete</code>, the move is all or nothing: if one put
    fails, the transaction aborts and no capture has moved. Had the code awaited the
    <code>getAll</code> result through <code>transact</code> and then written, the writes would have
    needed a second transaction, with a window between the read and the writes.
    <code>deleteByIndex</code> works the same way with <code>getAllKeys</code> and
    <code>delete</code>.
  </p>
  <DocsCode label={MOVE_BOOK.label} code={MOVE_BOOK.code} />
  <p>
    <code>movedCapture</code> writes a capture that passes the strict read as the checked capture under
    its new book id. A row that fails the read moves as it was stored, with only the book id changed,
    so it stays with its book and can still be found there.
  </p>
  <p>
    The capture repository's <code>moveBook</code> runs when captures are merged onto a book Dokseo
    holds, which <a href={IDENTITY_MERGE_HREF}>Merging captures onto a held book</a> describes. The
    <strong>Move b2's captures to b1</strong> button in the
    <a href={indexedDbHref('ranges')}>first demo</a> calls the same <code>rewriteByIndex</code> on the
    demo database.
  </p>
</DocsSection>

<DocsSection title={INDEXEDDB_SECTIONS.memory}>
  <p>
    The export builds a file from books, removed books, tags and captures. It reads the four lists
    with <code>Promise.all</code>, each in its own transaction, the books from <code>reader</code>
    and the rest from <code>recognition</code>. With the lists in memory, the join is a
    <code>Set</code> and a <code>Map</code>:
  </p>
  <DocsCode label={EXPORT_JOIN.label} code={EXPORT_JOIN.code} />
  <p>
    <code>held</code> is the set of book ids that captures point at, and filtering the known books
    by it is a semi-join. <code>keys</code> maps each kept book to its key in the file, and looking
    each capture up in it is a hash join. A capture whose book is in neither list is collected as
    <code>bookless</code>, an anti-join, and left out of the file.
  </p>
  <p>
    Deleting a tag needs no join in memory. A capture keeps its tags as a <code>tagIds</code> array,
    a many-to-many relation stored on one side, and the <code>multiEntry</code> index on that array
    finds every capture that holds the tag. The capture repository rewrites them through
    <code>rewriteByIndex</code>:
  </p>
  <DocsCode label={DELETE_TAG.label} code={DELETE_TAG.code} />
  <p>
    The read and every write share one transaction, so a failure leaves every capture as it was. A
    row that fails the strict read keeps the tag id: <code>untaggedRow</code> answers
    <code>null</code>, and the row is put back unchanged. The use case removes the tag record only
    after the rewrite succeeds. One book's captures come from the other index with
    <code>listByIndex</code> and are then sorted by <code>createdAt</code> in memory, since no index orders
    them by time.
  </p>
</DocsSection>

<DocsSection title={INDEXEDDB_SECTIONS.tabs}>
  <p>
    Dokseo can be open in more than one tab, and after a release one tab can run the new build while
    another still runs the old one. The steps of that case are in
    <a href={STORAGE_DATABASES_HREF}>Dokseo's three databases</a>. The two halves in
    <code>connection.ts</code>
    are short. The holding side closes its connection on <code>versionchange</code> and marks it retired,
    so the next helper call opens a fresh connection:
  </p>
  <DocsCode label={VERSION_CHANGE.label} code={VERSION_CHANGE.code} />
  <p>
    On <code>blocked</code>, the opening side starts a timer and gives up after
    {patienceSeconds} seconds with the message "is held open by another tab of the app. Close or reload
    the other tabs, then try again." A tab running this code closes at once, so only a tab running code
    from before the connection module handled <code>versionchange</code> can hold an upgrade that long.
  </p>
  <DocsCode label={BLOCKED_PATIENCE.label} code={BLOCKED_PATIENCE.code} />
  <p>
    The old tab's next open passes its own, now lower, version and fails with a
    <code>VersionError</code>, which the module turns into "was upgraded by a newer version of the
    app in another tab. Reload this page to keep going."
  </p>
</DocsSection>

<DocsSection title={INDEXEDDB_SECTIONS.bumps}>
  <p>Each database's version moved only when a store or an index was added:</p>
  <Table size="sm" caption="What each version added">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Database</TableHeaderCell>
        <TableHeaderCell>Versions</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each HISTORY as row (row.database)}
        <TableRow>
          <TableCell><code>{row.database}</code></TableCell>
          <TableCell>{row.steps}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <StepList>
    <StepItem title="A new store or index bumps the version">
      <p>
        The new store is created in the same upgrade function as the old ones, behind its own
        <code>objectStoreNames.contains</code> guard, so a device at any older version gets exactly the
        stores and indexes it lacks, and no existing row is rewritten or deleted.
      </p>
    </StepItem>
    <StepItem title="A change to a record's format bumps it too, from 1.0 on">
      <p>
        A store has no columns, so IndexedDB needs no new version for a new field. Dokseo reads
        every row strictly, with no defaults, so a row without the field would be unreadable. From
        1.0 on, a format change raises the version, and the upgrade rewrites every row into the new
        format in its own transaction. A tab still on the older build then cannot open the database,
        so it cannot save a row in the old format over a migrated one (<a
          href="/docs/series-plan#compatibility-through-database-versions"
          >Compatibility through database versions</a
        >).
      </p>
    </StepItem>
    <StepItem title="One version constant per database">
      <p>
        Two adapters opening the same database with versions of their own would fail with a
        <code>VersionError</code> for whichever opened second at the lower one. So each database's name,
        version, store names and upgrade sit in one module that every adapter on that database calls,
        and it keeps one connection for all of them.
      </p>
    </StepItem>
  </StepList>
</DocsSection>

<DocsSection title={INDEXEDDB_SECTIONS.proxy}>
  <p>
    One write failed in a way only a browser showed. A view model kept the import plan in a deep
    <code>$state</code>, Svelte wrapped the plan and every capture in it in proxies, and when a
    capture from the plan reached <code>putRecord</code>, <code>put</code> threw a
    <code>DataCloneError</code>, because a proxy cannot be cloned. The unit tests ran in Node, where
    runes do not proxy, and passed.
    <a href={EXPORT_PROXY_HREF}>A proxy IndexedDB could not clone</a> describes the failure and the
    two fixes, <code>$state.raw</code> and <code>$state.snapshot</code>.
  </p>
</DocsSection>

<DocsSection title={INDEXEDDB_SECTIONS.rule}>
  <p>
    Treat IndexedDB as a sorted key-value store with secondary indexes, and design each store around
    the requests that will read it: every field a screen filters or sorts by needs an index, created
    in an upgrade that creates whatever is missing and touches no data. Keep a transaction to the
    requests it needs and do any other awaited work before it opens, and when a read and its writes
    must succeed together, place the writes from the read's own <code>success</code> handler.
    Resolve on <code>complete</code>. Do joins, groups and counts per group in code, and check every
    record on the way out, because the store keeps whatever was put in it.
  </p>
</DocsSection>
