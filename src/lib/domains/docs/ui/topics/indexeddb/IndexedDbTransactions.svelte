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
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import AutoCommitDemo from './AutoCommitDemo.svelte';
  import { TRANSACTION_LIFETIME } from './indexeddb-diagrams';
  import {
    ASYNC_HREF,
    INDEXEDDB_SECTIONS,
    SQL_GROUPING_HREF,
    SQL_JOINS_HREF,
    indexedDbHref,
  } from './indexeddb-sections';
  import VersionDemo from './VersionDemo.svelte';

  const BROKEN_AWAIT = `const transaction = db.transaction('notes', 'readwrite');
const notes = transaction.objectStore('notes');
notes.put({ text: 'first' });
const response = await fetch('/notes/second.txt');
notes.put({ text: 'second', status: response.status });`;

  const FIXED_AWAIT = `const response = await fetch('/notes/second.txt');
const transaction = db.transaction('notes', 'readwrite');
const notes = transaction.objectStore('notes');
notes.put({ text: 'first' });
notes.put({ text: 'second', status: response.status });`;

  const UPGRADE_BY_VERSION = `request.onupgradeneeded = (event) => {
  const db = request.result;
  if (event.oldVersion < 1) db.createObjectStore('books', { keyPath: 'id' });
  if (event.oldVersion < 2) db.createObjectStore('page-lists', { keyPath: 'id' });
  if (event.oldVersion < 3) db.createObjectStore('removed-books', { keyPath: 'id' });
};`;

  const LACKS = [
    {
      sql: 'JOIN',
      instead:
        'Code reads one store, then the other, and matches the records itself: a lookup per key or one batch and a Map.',
    },
    {
      sql: 'GROUP BY, SUM, AVG',
      instead: 'count() exists. Everything else is a loop over a cursor or a getAll() result.',
    },
    {
      sql: 'WHERE on any column',
      instead:
        'A request names one store or one index and one key range. A field with no index can only be filtered after reading every record.',
    },
    {
      sql: 'A query planner',
      instead:
        'Each request is the plan. The code picks the index, and two conditions on two fields need a compound index or a filter in code.',
    },
    {
      sql: 'ORDER BY',
      instead: 'Records come back in the order of the store or index they are read from.',
    },
    {
      sql: 'SELECT a, b',
      instead:
        'A value is read whole. Only keys can be read alone, with getAllKeys() or a key cursor.',
    },
    {
      sql: 'Columns, types, foreign keys',
      instead:
        'A store checks only its key and its unique indexes. What a record holds is up to the code that wrote it.',
    },
  ] as const;
</script>

<DocsSection title={INDEXEDDB_SECTIONS.transactions}>
  <p>
    Every read and write happens in a transaction. <code>db.transaction(stores, mode)</code> names
    its
    <em>scope</em>, the stores it may touch, and its mode: <code>readonly</code> or
    <code>readwrite</code>. A third mode, <code>versionchange</code>, exists only during an upgrade.
    Calling <code>objectStore()</code> with a store outside the scope throws a
    <code>NotFoundError</code>.
  </p>
  <p>The scope and mode decide what may run at the same time. The specification's rules are:</p>
  <ul>
    <li>
      A <code>readonly</code> transaction can start when no earlier, unfinished
      <code>readwrite</code> transaction has an overlapping scope.
    </li>
    <li>
      A <code>readwrite</code> transaction can start when no earlier, unfinished transaction of any mode
      has an overlapping scope.
    </li>
  </ul>
  <p>
    Inside one transaction, requests run in the order they were made and their results arrive in
    that order. A transaction commits all of its writes or none of them. A request's
    <code>success</code> means that request ran, not that anything is on disk; the transaction's
    <code>complete</code> event means its writes are committed.
  </p>
</DocsSection>

<DocsSection title={INDEXEDDB_SECTIONS.autoCommit}>
  <p>
    A transaction has no <code>COMMIT</code> statement that the code must reach. It commits by
    itself once it is <em>inactive</em> and has no request left to run. The rules that decide this are
    short:
  </p>
  <ul>
    <li>A new transaction is <em>active</em>: requests can be placed on it.</li>
    <li>
      When the task that created it ends, and control returns to the event loop, it becomes
      inactive.
    </li>
    <li>
      While a <code>success</code> or <code>error</code> event of one of its requests is dispatched, it
      is active again, so a handler can place more requests.
    </li>
    <li>
      When it is inactive and every request has completed and been handled, it commits and fires
      <code>complete</code>.
    </li>
    <li>
      Placing a request on a transaction that is not active throws a
      <code>TransactionInactiveError</code>.
    </li>
  </ul>
  <p>
    These rules keep transactions short, which matters because a <code>readwrite</code> transaction holds
    back every later transaction on the same stores. They also produce the classic failure. A function
    stores two notes, the second with the status of a request to the server:
  </p>
  <DocsCode label="An unrelated await inside a transaction" code={BROKEN_AWAIT} />
  <StepList>
    <StepItem title="The function opens a transaction and puts the first note">
      <p>The transaction is active and has one request waiting to run.</p>
    </StepItem>
    <StepItem title="It awaits the fetch">
      <p>
        <code>fetch</code> resolves its promise when the response arrives, in a later task. The task that
        created the transaction ends, and the transaction becomes inactive.
      </p>
    </StepItem>
    <StepItem title="The first put runs and succeeds">
      <p>
        Its <code>success</code> event places no new request. Nothing is pending, so the transaction commits.
        The first note is stored.
      </p>
    </StepItem>
    <StepItem title="The response arrives and the function puts the second note">
      <p>
        The transaction is finished. <code>put</code> throws a
        <code>TransactionInactiveError</code>, and the second note is never written. Even if the
        response had arrived before the first put completed, the transaction would already be
        inactive, and the result would be the same.
      </p>
    </StepItem>
  </StepList>
  <Figure>
    <Diagram {...TRANSACTION_LIFETIME} />
    {#snippet caption()}
      A transaction's lifetime on the event loop, with requests only and with an unrelated await.
    {/snippet}
  </Figure>
  <p>The fix is to finish the unrelated work before the transaction exists:</p>
  <DocsCode label="The await first, then the transaction" code={FIXED_AWAIT} />
  <p>
    Awaiting IndexedDB's own requests is different. A promise resolved inside a request's
    <code>success</code> handler continues as a microtask, and microtasks run before the event's
    dispatch ends, while the transaction is still active. That is why a promise wrapper around
    requests can chain several of them with <code>await</code>. The demo runs all three versions;
    <a href={ASYNC_HREF}>Async correctness</a> covers awaits and their timing in general.
  </p>
  <AutoCommitDemo />
  <p>
    The demo waits on a 0 ms timer because a timer callback always runs in a new task. What ends the
    transaction is the task in which the awaited promise settles, and the <code>await</code> line
    does not show it. An already settled promise continues in a microtask of the same task and ends
    nothing. I first built the demo around <code>crypto.subtle.digest</code> on a few bytes: in
    WebKit the second put threw <code>TransactionInactiveError</code>, while in Chromium it was
    accepted on every run. Code that happens to pass in one browser can fail in another, so the only
    safe order is the unrelated work first.
  </p>
  <p>
    The 3.0 draft also has <code>transaction.commit()</code>, which starts the commit without
    waiting for the remaining results to be handled. It is optional; a transaction commits without
    it.
  </p>
</DocsSection>

<DocsSection title={INDEXEDDB_SECTIONS.upgrades}>
  <p>
    The version number controls the database's layout. Stores and indexes can be created or deleted
    only inside an <em>upgrade</em>, and an upgrade runs only when
    <code>open(name, version)</code> passes a version higher than the stored one. Opening a database that
    does not exist yet is an upgrade from version 0.
  </p>
  <StepList>
    <StepItem title="Other connections get versionchange">
      <p>
        Every other open connection to that database, in any tab, receives a
        <code>versionchange</code> event with the old and new versions. A connection that calls
        <code>close()</code> in response steps out of the way.
      </p>
    </StepItem>
    <StepItem title="The opener gets blocked if any stay open">
      <p>
        The open request fires <code>blocked</code> and then waits, with no time limit, until the last
        of them closes. Blocked is not a failure: the request goes on as soon as they are gone.
      </p>
    </StepItem>
    <StepItem title="upgradeneeded runs the upgrade">
      <p>
        The request fires <code>upgradeneeded</code> with <code>oldVersion</code> and
        <code>newVersion</code>, inside a <code>versionchange</code> transaction over every store. If
        that transaction aborts, the stored version stays as it was.
      </p>
    </StepItem>
    <StepItem title="success, or VersionError">
      <p>
        Then <code>success</code> delivers the connection. Opening at a version lower than the
        stored one fails at once with a <code>VersionError</code>, and <code>open(name)</code> without
        a version opens whatever version is stored, or creates version 1.
      </p>
    </StepItem>
  </StepList>
  <p>
    The upgrade handler gets the database as it is on that device, which may be at any older
    version: a new install starts at 0, and a device that skipped two releases jumps two versions at
    once. So an upgrade has to bring every possible old version to the new one. One way is to switch
    on
    <code>oldVersion</code>:
  </p>
  <DocsCode label="An upgrade written per version step" code={UPGRADE_BY_VERSION} />
  <p>
    The other is to create whatever is missing, with
    <code>db.objectStoreNames.contains</code> guarding each store, which is what Dokseo does. Either
    way, an upgrade that creates a store unconditionally throws a <code>ConstraintError</code> the second
    time it runs, and one that deletes a store to start clean deletes the data in it.
  </p>
  <p>
    The specification's own example for <code>blocked</code> sets a timer and shows a message if the upgrade
    is still blocked when it fires. The demo below plays both tabs on one page.
  </p>
  <VersionDemo />
  <p>
    With "A closes" ticked, B upgrades at once. Unticked, B logs <code>blocked</code> and waits
    until
    <strong>Close A</strong>. Reopening A at its old version afterwards fails with a
    <code>VersionError</code>, which is what an old tab meets after a new build has upgraded the
    database.
  </p>
</DocsSection>

<DocsSection title={INDEXEDDB_SECTIONS.errors}>
  <p>
    A failed request fires an <code>error</code> event, and the event bubbles from the request to
    its transaction and then to the database connection. Unless a handler calls
    <code>preventDefault()</code> on it, the transaction aborts, and an abort rolls back every
    change the transaction made, including the writes that succeeded before the failure. An
    exception thrown inside a <code>success</code> or <code>error</code> handler aborts the
    transaction too, with an
    <code>AbortError</code>. <code>transaction.abort()</code> does the same on purpose.
  </p>
  <p>
    The <strong>Add two books, one with a taken hash</strong> button in the first demo shows this:
    the first <code>add</code> succeeds, the second breaks the unique <code>hash</code> index, and the
    book count afterwards is unchanged, because the abort took the first book back out.
  </p>
  <p>The errors met most often:</p>
  <ul>
    <li>
      <code>ConstraintError</code>: <code>add</code> on a taken key, or a duplicate in a unique index.
    </li>
    <li>
      <code>DataCloneError</code>: a value the structured clone cannot copy, thrown by
      <code>put</code> itself.
    </li>
    <li>
      <code>DataError</code>: a key that is not a valid key, or a value missing its in-line key.
    </li>
    <li><code>QuotaExceededError</code>: the origin is out of space; the transaction aborts.</li>
    <li>
      <code>TransactionInactiveError</code>: a request placed after the transaction stopped being
      active.
    </li>
    <li><code>VersionError</code>: an open at a version below the stored one.</li>
  </ul>
</DocsSection>

<DocsSection title={INDEXEDDB_SECTIONS.missing}>
  <p>
    Each IndexedDB request reads one store or one index over one key range. Everything a SQL engine
    does above that level, the code does instead:
  </p>
  <Table size="sm" caption="SQL features and what replaces them">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>SQL</TableHeaderCell>
        <TableHeaderCell>In IndexedDB</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each LACKS as row (row.sql)}
        <TableRow>
          <TableCell><code>{row.sql}</code></TableCell>
          <TableCell>{row.instead}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    So a query is designed when the store is: whatever must be fast needs an index, created in an
    upgrade. The next sections take the operations that
    <a href={SQL_JOINS_HREF}>A join is a filtered product</a> and
    <a href={SQL_GROUPING_HREF}>GROUP BY is a partition</a> define as set operations and build them
    from requests, starting with <a href={indexedDbHref('join')}>the join</a>.
  </p>
</DocsSection>
