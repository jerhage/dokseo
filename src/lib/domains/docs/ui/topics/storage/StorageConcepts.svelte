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
  import EstimateReadout from './EstimateReadout.svelte';
  import PersistRequest from './PersistRequest.svelte';
  import ScratchDatabaseDemo from './ScratchDatabaseDemo.svelte';
  import ScratchFileDemo from './ScratchFileDemo.svelte';
  import { EVICTION_DECISION } from './storage-diagrams';
  import { STORAGE_SECTIONS } from './storage-sections';
  import { SCRATCH_OPEN, SCRATCH_WRITE } from './storage-snippets';
</script>

<DocsSection title={STORAGE_SECTIONS.apis}>
  <p>
    A browser gives every origin its own storage. An origin is the scheme, host and port of a page,
    so <code>http://localhost:5173</code> and the deployed site are two origins with two separate copies
    of everything below, and neither can read the other's. Inside one origin there are four places a script
    can put data, each built for a different kind of data.
  </p>
  <Table size="sm">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>API</TableHeaderCell>
        <TableHeaderCell>Holds</TableHeaderCell>
        <TableHeaderCell>Reached by</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell><code>localStorage</code></TableCell>
        <TableCell>String keys and string values, up to 5 MiB per origin</TableCell>
        <TableCell>Synchronous calls, from a page only</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>IndexedDB</TableCell>
        <TableCell>Structured records in object stores, found by key or by index</TableCell>
        <TableCell>Asynchronous requests inside transactions, from a page or a worker</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Cache API</TableCell>
        <TableCell>HTTP responses, keyed by their request</TableCell>
        <TableCell>Promises, from a page, a worker or a service worker</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Origin private file system (OPFS)</TableCell>
        <TableCell>Files and folders of any size</TableCell>
        <TableCell>Promises, plus a synchronous handle inside a dedicated worker</TableCell>
      </TableRow>
    </TableBody>
  </Table>
  <p>
    <code>localStorage</code> is the one most web developers meet first, and its limits show why the
    others exist. Every call blocks the page until it returns, it stores only strings, so an object
    goes through <code>JSON.stringify</code>, and past its few megabytes a write throws a
    <code>QuotaExceededError</code>. It suits a handful of small settings. It does not suit a
    library of books.
  </p>
</DocsSection>

<DocsSection title={STORAGE_SECTIONS.indexeddb}>
  <p>
    IndexedDB is a database of JavaScript values. A database has a name and an integer version, and
    holds object stores, each a sorted collection of records under a key. A record can be any value
    the structured clone algorithm copies: objects, arrays, dates, and <code>Blob</code>s.
  </p>
  <p>
    The version controls the layout. Opening a database at a version higher than the stored one
    fires <code>upgradeneeded</code>, and that event is the only place a store or an index can be
    created or deleted. Opening it at the same version just opens it. Every read and write happens
    inside a transaction, and a write is committed once its transaction fires <code>complete</code>,
    not when its request succeeds.
  </p>
  <DocsCode label={SCRATCH_OPEN.label} code={SCRATCH_OPEN.code} />
  <ScratchDatabaseDemo />
</DocsSection>

<DocsSection title={STORAGE_SECTIONS.opfs}>
  <p>
    The origin private file system is a real file system that belongs to the origin and to nothing
    else. It does not appear in the device's file manager or in a file picker.
    <code>navigator.storage.getDirectory()</code> returns its root folder, and from there
    <code>getDirectoryHandle</code> and <code>getFileHandle</code> walk to a file. Reading one is
    cheap:
    <code>getFile()</code> returns a <code>File</code>, and <code>file.slice(from, to)</code> reads just
    that range of bytes, which is what a large book file needs.
  </p>
  <p>
    Writing has two APIs. <code>createWritable()</code> returns a stream that works on the main
    thread, but Safari only shipped it in version 26. <code>createSyncAccessHandle()</code> has been
    in Chrome since 102, Firefox since 111 and Safari since 15.2, and it exists only inside a
    dedicated worker. It takes an exclusive lock on the file until <code>close()</code>, and its
    <code>write</code>
    and
    <code>flush</code> calls block the worker, never the page.
  </p>
  <DocsCode label={SCRATCH_WRITE.label} code={SCRATCH_WRITE.code} />
  <ScratchFileDemo />
</DocsSection>

<DocsSection title={STORAGE_SECTIONS.quota}>
  <p>
    All four APIs share one allowance per origin, the quota. Each engine sets it differently. Chrome
    allows an origin up to 60% of the disk. Firefox allows the smaller of 10% of the disk and 10 GiB
    to all the origins of one site, and up to half the disk to an origin with persistent storage.
    Safari 17 allows an origin up to 60% of the disk in the Safari app, the same for a web app on
    the home screen or in the Dock, and 15% in an app that embeds a web view.
  </p>
  <p>
    <code>navigator.storage.estimate()</code> returns two numbers for the origin:
    <code>usage</code>, what all its stores hold, and <code>quota</code>, what it may hold. The
    Storage Standard calls both a rough estimate: an engine may compress or deduplicate what it
    stores, and it pads the size of responses from other origins, so the figures cannot be used to
    measure exact bytes.
  </p>
  <EstimateReadout />
</DocsSection>

<DocsSection title={STORAGE_SECTIONS.modes}>
  <p>
    The Storage Standard gives an origin's storage one of two modes. It starts as
    <strong>best-effort</strong>: the browser keeps the data while there is room, and may delete it
    without asking when there is not. It becomes <strong>persistent</strong> only with the
    <code>persistent-storage</code> permission, and then the browser does not clear it without the person's
    consent. Under pressure, the standard has the browser clear best-effort storage first, and only then
    ask about persistent storage.
  </p>
  <p>
    Neither mode survives the person clearing the site's data in the browser's settings. Persistent
    means the browser does not delete it on its own.
  </p>
</DocsSection>

<DocsSection title={STORAGE_SECTIONS.eviction}>
  <p>
    Eviction is the browser deleting best-effort data on its own. It starts when the disk runs low,
    or when the storage of all origins together passes the browser's own limit. The browser then
    takes origins in least recently used order, skips any that is persistent, and deletes each whole
    origin at once, every store together, because deleting part of an origin could leave the rest
    inconsistent. WebKit may also skip an origin that has a page open at that moment.
  </p>
  <Figure>
    <Diagram {...EVICTION_DECISION} />
    {#snippet caption()}
      Eviction under pressure works on whole origins and skips persistent ones. Safari's seven-day
      rule is a separate path.
    {/snippet}
  </Figure>
</DocsSection>

<DocsSection title={STORAGE_SECTIONS.safari}>
  <p>
    Safari has a second path that needs no pressure at all. Since Safari 13.1 and iOS 13.4,
    Intelligent Tracking Prevention caps all script-writable storage at seven days of Safari use. A
    site with no interaction during seven days on which Safari was used loses its IndexedDB,
    localStorage, sessionStorage, media keys, and service worker registrations and caches. The days
    counted are days Safari was used, not calendar days, so a phone left in a drawer counts nothing.
  </p>
  <p>
    The rule was written to remove data a tracker left behind, but it applies to every site opened
    in a Safari tab. For an app that keeps a library on the device, it plays out like this:
  </p>
  <StepList>
    <StepItem title="Use the app in a Safari tab">
      <p>Add books and take captures. Everything lands in this origin's storage.</p>
    </StepItem>
    <StepItem title="Keep using Safari, but not the app">
      <p>Browse other sites for seven days of Safari use without opening the app.</p>
    </StepItem>
    <StepItem title="Come back">
      <p>Safari has deleted the app's script-written data, and the library is empty.</p>
    </StepItem>
  </StepList>
  <p>
    WebKit's list of affected storage predates the origin private file system in Safari and does not
    name it, and WebKit's posts do not say whether a persistence grant exempts a site. A web app
    added to the home screen is exempt, which the iOS section below explains.
  </p>
</DocsSection>

<DocsSection title={STORAGE_SECTIONS.persist}>
  <p>
    <code>navigator.storage.persist()</code> requests the persistent mode and resolves
    <code>true</code> if the origin now has it. <code>navigator.storage.persisted()</code> reports the
    current mode without requesting anything. How the result is reached depends on the engine:
  </p>
  <ul>
    <li>Firefox shows a prompt and lets the person decide.</li>
    <li>
      Chrome shows nothing. It bases the result on the site's engagement, whether it is installed or
      bookmarked, and whether it may show notifications.
    </li>
    <li>
      Safari shows nothing either. WebKit grants it from heuristics such as whether the site runs as
      a home-screen web app.
    </li>
  </ul>
  <p>
    That is why a request on first paint likely resolves <code>false</code> in Chrome and Safari. A
    first visit has no engagement, no install and no notifications to grant it on. In Firefox the
    prompt would appear before the person has stored anything, and web.dev advises against
    requesting during page load for that reason. A request made after the person has stored
    something they care about meets a better history, and a request that resolved <code>false</code> can
    be made again later and is evaluated again.
  </p>
  <PersistRequest />
</DocsSection>

<DocsSection title={STORAGE_SECTIONS.homeScreen}>
  <p>
    On iOS and iPadOS, Add to Home Screen creates a web app that runs outside Safari. WebKit keeps a
    home-screen web app's website data isolated from Safari's, so the same site has two separate
    storages on one device: a book added in a Safari tab is not in the home-screen app, and the
    other way round. Each gets the quota of the Safari app.
  </p>
  <p>
    The home-screen app also escapes the seven-day rule. WebKit counts its days of use separately
    from Safari's, so they match real use of the app, and exempts its first-party data from the cap.
    And being opened as a home-screen web app is one of the heuristics WebKit names for granting
    <code>persist()</code>. For an app that keeps a library on an iPhone or iPad, the home-screen
    app is the place to keep it.
  </p>
</DocsSection>
