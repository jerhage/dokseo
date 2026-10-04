<script lang="ts">
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import {
    INDEXEDDB_SECTIONS,
    SQL_ANTI_HREF,
    SQL_EXISTS_HREF,
    SQL_N_PLUS_ONE_HREF,
    SQL_PROJECTION_HREF,
    SQL_SEMI_HREF,
    indexedDbHref,
  } from './indexeddb-sections';
  import JoinDemo from './JoinDemo.svelte';

  const LOOKUP_JOIN = `const books = await all(bookStore.getAll());
for (const book of books) {
  book.captures = await all(captureStore.index('bookId').getAll(book.id));
}`;

  const BATCH_JOIN = `const [books, captures] = await Promise.all([
  all(bookStore.getAll()),
  all(captureStore.getAll()),
]);
const byBook = Map.groupBy(captures, (capture) => capture.bookId);
const joined = books.map((book) => ({ ...book, captures: byBook.get(book.id) ?? [] }));`;

  const DISTINCT_KEYS = `const held = new Set();
const request = captures.index('bookId').openKeyCursor(null, 'nextunique');
request.onsuccess = () => {
  const cursor = request.result;
  if (cursor === null) return done(held);
  held.add(cursor.key);
  cursor.continue();
};`;

  const ANTI_JOIN = `const bookIds = await all(books.getAllKeys());
const without = bookIds.filter((id) => !held.has(id));`;

  const GROUP_COUNT = `const perBook = new Map();
const request = captures.index('bookId').openKeyCursor();
request.onsuccess = () => {
  const cursor = request.result;
  if (cursor === null) return done(perBook);
  perBook.set(cursor.key, (perBook.get(cursor.key) ?? 0) + 1);
  cursor.continue();
};`;
</script>

<DocsSection title={INDEXEDDB_SECTIONS.join}>
  <p>
    The examples below use the demo's two stores, <code>books</code> and
    <code>captures</code>, where each capture holds the <code>bookId</code> of its book and
    <code>captures</code> has an index on <code>bookId</code>. The <code>all</code> helper wraps a
    request in a promise. The goal is the result of
    <code>books JOIN captures ON captures.bookId = books.id</code>, grouped by book.
  </p>
  <p>
    The first way follows the data: read the books, then look up each book's captures through the
    index. In SQL terms it is a nested loop join that uses an index for the inner side.
  </p>
  <DocsCode label="One index lookup per book" code={LOOKUP_JOIN} />
  <p>
    That is 1 + N requests for N books, the N+1 pattern that
    <a href={SQL_N_PLUS_ONE_HREF}>Load a list with its children</a> describes for SQL. There is no network
    between the code and an IndexedDB database, so each request costs much less than a round trip to a
    server, but each still passes through the event loop, and its result is cloned out of the store.
  </p>
  <p>
    The second way reads both stores once and joins in memory, which a SQL engine would call a hash
    join:
  </p>
  <DocsCode label="Two scans and a Map" code={BATCH_JOIN} />
  <p>
    That is two requests at any size, but both read every record, and the whole of both stores is in
    memory at once. When only some books are needed, the lookups read less; when all of them are,
    the two scans make fewer requests. A third case, one capture's book, is a single <code>get</code
    > by key, and the same N+1 appears when that is done for every capture in a list.
  </p>
  <JoinDemo />
  <p>
    The request counts follow from the strategy: 1 + N per book, 1 + N per capture, and 2. The times
    depend on the browser and the device, so the demo measures them here rather than the page
    stating them.
  </p>
</DocsSection>

<DocsSection title={INDEXEDDB_SECTIONS.semi}>
  <p>
    A <a href={SQL_SEMI_HREF}>semi-join</a> keeps the rows of one table that have at least one match
    in another: the books that hold a capture. An index already holds the answer, because its
    entries are sorted by <code>bookId</code>. A key cursor with the direction
    <code>nextunique</code>
    stops once per distinct <code>bookId</code> and clones no values, so it reads the set of book ids
    that have captures in one request:
  </p>
  <DocsCode label="Distinct index keys with nextunique" code={DISTINCT_KEYS} />
  <p>
    For a single book, the check in
    <a href={SQL_EXISTS_HREF}>Check whether a matching row exists</a> becomes
    <code>index('bookId').count(id)</code> above zero, or <code>getKey(id)</code> returning a key.
    The
    <a href={SQL_ANTI_HREF}>anti-join</a>, the books with no capture, is the difference between all
    book keys and that set:
  </p>
  <DocsCode label="Books with no capture" code={ANTI_JOIN} />
  <p>
    <code>getAllKeys</code> and key cursors are the nearest thing IndexedDB has to a
    <a href={SQL_PROJECTION_HREF}>projection</a>: they read keys and leave the values in the store.
    There is no way to read some fields of a value and not the others.
  </p>
</DocsSection>

<DocsSection title={INDEXEDDB_SECTIONS.count}>
  <p>
    <code>count(query)</code> on a store or an index counts the matching records without cloning
    them: <code>captures.count()</code> is <code>SELECT COUNT(*)</code>, and
    <code>captures.index('bookId').count('b1')</code> adds <code>WHERE bookId = 'b1'</code>.
  </p>
  <p>
    A count per group has no single request. A key cursor over the index visits every entry in
    <code>bookId</code> order, one <code>success</code> event each, and the code tallies them, which
    is <code>SELECT bookId, COUNT(*) … GROUP BY bookId</code>:
  </p>
  <DocsCode label="A count per book from one key cursor" code={GROUP_COUNT} />
  <p>
    Sums, averages and maximums work the same way over a value cursor or a <code>getAll</code>
    result. A maximum by an indexed field is the one exception that needs a single step: a cursor opened
    with <code>prev</code> starts at the highest key.
  </p>
</DocsSection>

<DocsSection title={INDEXEDDB_SECTIONS.sorting}>
  <p>
    Records come back in key order, so an index is the <code>ORDER BY</code>. To list captures by
    time, read them through an index on <code>createdAt</code>; for newest first, open a cursor with
    <code>prev</code>. Without such an index, the code reads everything and sorts in memory, which
    is fine for a few hundred records and is what a query planner would do with no index either.
  </p>
  <p>
    Filtering by one field and sorting by another takes a compound index. With an index on
    <code>['bookId', 'createdAt']</code>, the range
    <code>IDBKeyRange.bound(['b2'], ['b2', []])</code> returns book b2's captures oldest first,
    which is
    <code>WHERE bookId = 'b2' ORDER BY createdAt</code>. The order of the fields matters, as it does
    in a SQL composite index: the field compared for equality comes first.
  </p>
  <p>
    An index sorts strings by code unit, so it cannot give a reader's alphabetical order: uppercase
    sorts before lowercase, and accented letters sort after <code>z</code>. A title list for people
    is sorted in code with <code>Intl.Collator</code>.
  </p>
</DocsSection>

<DocsSection title={INDEXEDDB_SECTIONS.denormalize}>
  <p>
    Without joins at read time, the other option is to store data where it is read. A capture could
    hold a copy of its book's title, and a list of captures would then need no second store. The
    cost moves to the writes: renaming a book must rewrite every capture that holds the old title,
    which <a href={indexedDbHref('move')}>a rewrite by index</a> can do in one transaction, and any path
    that forgets to do it leaves copies that disagree.
  </p>
  <p>
    A many-to-many relation can be stored the same way, as an array of ids inside one of the two
    records. A <code>multiEntry</code> index on that array then answers "which records hold this id" without
    a link table.
  </p>
</DocsSection>
