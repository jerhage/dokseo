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
  import { DATABASE_LAYOUT } from './indexeddb-diagrams';
  import {
    IDENTITY_UNREADABLE_HREF,
    INDEXEDDB_SECTIONS,
    STORAGE_APIS_HREF,
    STORAGE_EVICTION_HREF,
    STORAGE_ROWS_HREF,
    WORKERS_CLONE_HREF,
  } from './indexeddb-sections';
  import QueryLabDemo from './QueryLabDemo.svelte';

  const OPEN_EXAMPLE = `const request = indexedDB.open('dokseo-docs-indexeddb', 1);
request.onupgradeneeded = () => {
  const db = request.result;
  const captures = db.createObjectStore('captures', { keyPath: 'id', autoIncrement: true });
  captures.createIndex('bookId', 'bookId');
};
request.onsuccess = () => {
  const db = request.result;
  const store = db.transaction('captures', 'readwrite').objectStore('captures');
  store.add({ bookId: 'b2', page: 12, createdAt: 1005 });
};`;

  const INDEX_EXAMPLE = `captures.createIndex('bookId', 'bookId');
captures.createIndex('bookId-createdAt', ['bookId', 'createdAt']);
captures.createIndex('tagIds', 'tagIds', { multiEntry: true });
books.createIndex('hash', 'hash', { unique: true });`;

  const RANGE_EXAMPLE = `IDBKeyRange.only('b2');
IDBKeyRange.lowerBound(1003);
IDBKeyRange.upperBound(1003, true);
IDBKeyRange.bound(3, 7);
IDBKeyRange.bound(['b2'], ['b2', []]);`;

  const CURSOR_EXAMPLE = `const request = captures.index('createdAt').openCursor(null, 'prev');
request.onsuccess = () => {
  const cursor = request.result;
  if (cursor === null) return;
  show(cursor.key, cursor.primaryKey, cursor.value);
  cursor.continue();
};`;

  const KEY_ORDER = [
    { type: 'number', example: '-Infinity, 0, 1005', note: 'every number except NaN' },
    { type: 'date', example: 'new Date(0)', note: 'a Date whose time is not NaN' },
    { type: 'string', example: "'b2', 'B2'", note: 'compared code unit by code unit' },
    { type: 'binary', example: 'new Uint8Array([1])', note: 'an ArrayBuffer or a view on one' },
    { type: 'array', example: "['b2', 1005]", note: 'compared element by element' },
  ] as const;
</script>

<DocsSection title={INDEXEDDB_SECTIONS.model}>
  <p>
    IndexedDB is a database built into every browser, with one set of databases per origin.
    <a href={STORAGE_APIS_HREF}>Where a web app can keep data</a> places it beside
    <code>localStorage</code>, the Cache API and the origin private file system, and
    <a href={STORAGE_EVICTION_HREF}>Eviction</a> explains why the browser may delete all of it. Someone
    who knows SQL can treat it as a database.
  </p>
  <p>
    A <em>database</em> has a name and an integer version. It holds <em>object stores</em>, the
    nearest thing to tables. A store has no columns: each <em>record</em> is a key and a JavaScript
    value, and the store keeps its records sorted by key. A store can have <em>indexes</em>, and
    unlike a SQL index, an index is something the code reads directly: it is a second sorted list of
    the same records, ordered by a field of the value.
  </p>
  <Figure>
    <Diagram {...DATABASE_LAYOUT} />
    {#snippet caption()}A database holds stores; a store holds records and keeps its indexes.{/snippet}
  </Figure>
  <p>
    The API is older than promises. Every call returns an <code>IDBRequest</code>, and the answer
    arrives later as a <code>success</code> or <code>error</code> event on it. Opening is a request
    too, and the version passed to <code>open</code> determines whether the layout of the database changes
    first:
  </p>
  <DocsCode label="Opening a database, creating a store, adding a record" code={OPEN_EXAMPLE} />
</DocsSection>

<DocsSection title={INDEXEDDB_SECTIONS.keys}>
  <p>
    Every record has a primary key, and a store gets it one of two ways. With a <em>key path</em>,
    such as <code>keyPath: 'id'</code>, the key is read from the value, so the value must hold it. A
    key path can name a nested field (<code>'book.id'</code>) or be a list of fields, which makes a
    compound primary key. Without a key path, the key is passed separately:
    <code>put(value, key)</code>.
  </p>
  <p>
    <code>autoIncrement: true</code> gives the store a <em>key generator</em>. It starts at 1, adds
    1 for each generated key, and when the store also has a key path, writes the new key into the
    value it stores. A record put with an explicit number above the counter moves the counter past
    it. Past 2<sup>53</sup> the generator fails with a <code>ConstraintError</code>.
  </p>
  <p>
    <code>add</code> and <code>put</code> differ only on a key that is already taken:
    <code>add</code> fails with a <code>ConstraintError</code>, and <code>put</code> replaces the record.
  </p>
  <p>
    Not every value can be a key. The specification lists five key types, and when two keys of
    different types meet, the type sets the order before the values are compared:
  </p>
  <Table size="sm" caption="Valid keys, lowest type first">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Type</TableHeaderCell>
        <TableHeaderCell>Example</TableHeaderCell>
        <TableHeaderCell>Valid when</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each KEY_ORDER as row (row.type)}
        <TableRow>
          <TableCell>{row.type}</TableCell>
          <TableCell><code>{row.example}</code></TableCell>
          <TableCell>{row.note}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    So any number sorts before any string, and any array after everything. Booleans,
    <code>null</code>, <code>undefined</code> and plain objects are not keys at all; using one as a
    key throws a <code>DataError</code>. Strings compare by UTF-16 code unit, not by any language's
    alphabet, so <code>'Z'</code> sorts before <code>'a'</code>.
  </p>
</DocsSection>

<DocsSection title={INDEXEDDB_SECTIONS.clones}>
  <p>
    <code>put</code> does not keep the object it receives. It copies the value with the HTML
    standard's structured serialization, the storage flavor of the algorithm
    <code>postMessage</code>
    uses, which
    <a href={WORKERS_CLONE_HREF}>postMessage and the structured clone</a> covers in detail. Dates,
    maps, sets, typed arrays, <code>Blob</code>s and <code>File</code>s survive the copy. A class
    instance comes back as a plain object without its methods. A function, a symbol, a DOM node or a
    <code>Proxy</code> anywhere in the value makes <code>put</code> throw a
    <code>DataCloneError</code>
    at the call, before any request exists.
  </p>
  <p>
    A store checks the key and its unique indexes and nothing else. A read returns whatever was
    written, by this version of the code or by one from last year, so a field the code now requires
    can be missing and a value can have a type the code no longer accepts. The TypeScript type on a
    read is a claim, not a check. Dokseo checks every stored row when it reads it, which
    <a href={STORAGE_ROWS_HREF}>Reading a stored row back</a> and
    <a href={IDENTITY_UNREADABLE_HREF}>Rows Dokseo can no longer read</a> describe.
  </p>
</DocsSection>

<DocsSection title={INDEXEDDB_SECTIONS.indexes}>
  <p>An index is created inside an upgrade, on one store, with a name, a key path and two flags:</p>
  <DocsCode label="The indexes of the demo database" code={INDEX_EXAMPLE} />
  <p>
    Each index entry pairs an <em>index key</em>, taken from the value through the key path, with
    the record's primary key. Entries are sorted by index key, then by primary key, so records with
    the same <code>bookId</code> come back in id order. The store updates every index in the same transaction
    as the write, so an index is never behind its store.
  </p>
  <ul>
    <li>
      A <strong>single</strong> key path indexes one field.
    </li>
    <li>
      A <strong>compound</strong> key path, a list of fields, makes the index key an array, such as
      <code>['b2', 1005]</code>. Arrays compare element by element, which is what makes "one book,
      in time order" a single range.
    </li>
    <li>
      <strong>multiEntry</strong> applies when the field holds an array: the index gets one entry
      per distinct element instead of one entry for the whole array. A capture tagged
      <code>['vocab', 'grammar']</code> is found under both tags. A compound key path cannot be
      multiEntry;
      <code>createIndex</code> throws an <code>InvalidAccessError</code>.
    </li>
    <li>
      <strong>unique</strong> makes a second record with the same index key fail with a
      <code>ConstraintError</code>, like a <code>UNIQUE</code> constraint.
    </li>
  </ul>
  <p>
    A record whose value has no valid key at the index's key path gets no entry in that index, and
    the write still succeeds. So an index is also a filter: in the demo below, the capture with no
    <code>tagIds</code> field, and the one whose array is empty, appear in no tag lookup.
  </p>
</DocsSection>

<DocsSection title={INDEXEDDB_SECTIONS.ranges}>
  <p>
    A request selects records by key: one key, or an <code>IDBKeyRange</code>. A range has a lower
    and an upper bound, either of which may be left out, and each bound can be open (excluded) or
    closed (included).
  </p>
  <DocsCode label="Key ranges" code={RANGE_EXAMPLE} />
  <p>
    The last range uses the type order from the table above. Every key of the form
    <code>['b2', time]</code> is above <code>['b2']</code>, because a longer array with an equal
    start is greater, and below <code>['b2', []]</code>, because an array is greater than any
    number. So the range holds all of book b2's entries in a compound index.
  </p>
  <p>
    Stores and indexes answer the same requests. <code>get(query)</code> returns the first match,
    <code>getAll(query, count)</code> returns up to <code>count</code> values in key order, and
    <code>getAllKeys</code> returns primary keys only. <code>count(query)</code> returns a number.
    The Indexed Database API 3.0 draft adds a form
    <code>getAll({'{'} query, count, direction {'}'})</code>
    and a <code>getAllRecords</code> method; according to the draft, only Chrome and Edge 141 support
    them.
  </p>
  <p>
    A <em>cursor</em> walks the matches one record at a time. Each step is a <code>success</code>
    event on the same request, and <code>continue()</code> moves the cursor to the next match. The
    direction is
    <code>next</code>, <code>prev</code>, <code>nextunique</code> or <code>prevunique</code>; the
    unique directions stop once per distinct index key. <code>openKeyCursor</code> walks keys
    without cloning values, and in a <code>readwrite</code> transaction a cursor can
    <code>update</code>
    or
    <code>delete</code> the record it is on.
  </p>
  <DocsCode label="A cursor, newest first" code={CURSOR_EXAMPLE} />
  <QueryLabDemo />
  <p>
    The key column shows what the order follows. For a store it is the primary key; for an index it
    is the index key, and records with equal index keys follow in primary key order.
  </p>
</DocsSection>
