<script lang="ts">
  import Diagram from '$lib/ui/components/Diagram.svelte';
  import Figure from '$lib/ui/components/Figure.svelte';
  import StepItem from '$lib/ui/components/StepItem.svelte';
  import StepList from '$lib/ui/components/StepList.svelte';
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { INTERCEPTION, LIFECYCLE } from './offline-diagrams';
  import { HEADERS, MANIFEST } from './offline-snippets';
  import { OFFLINE_SECTIONS, offlineHref } from './sections';

  const REGISTER = `navigator.serviceWorker.register('/service-worker.js');`;

  const FETCH_HANDLER = `self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request).then((held) => held ?? fetch(event.request)));
});`;
</script>

<DocsSection title={OFFLINE_SECTIONS.worker}>
  <p>
    A web page normally needs the network every time it opens. The browser requests the HTML
    document, then the scripts, styles and fonts it names. With no connection the first request
    fails, and the browser shows its own error page instead of the app. Books, captures and model
    weights can sit on the device, and none of it helps if the code that reads them cannot load.
  </p>
  <p>
    A service worker is a script that a page registers for its origin. The browser runs it on its
    own thread, apart from any page, and keeps the registration after every tab closes.
  </p>
  <DocsCode label="Registering a service worker" code={REGISTER} />
  <p>
    Once it is active, every request from a page in its scope, and from the workers that page
    starts, reaches the service worker first as a <code>fetch</code> event. The scope is the folder
    the script is served from, so a script at <code>/service-worker.js</code> covers the whole
    origin. The handler can call <code>event.respondWith()</code> with any response it can build, usually
    one from a cache. If it does not call it, the browser makes the request as if no service worker existed.
  </p>
  <DocsCode label="The smallest offline handler" code={FETCH_HANDLER} />
  <Figure>
    <Diagram {...INTERCEPTION} />
    {#snippet caption()}The service worker sits between the page and the network.{/snippet}
  </Figure>
  <p>
    Because a service worker can respond to any request in its scope with any response, browsers
    register one only in a secure context: a page served over HTTPS, or from <code>localhost</code>.
  </p>
</DocsSection>

<DocsSection title={OFFLINE_SECTIONS.lifecycle}>
  <p>
    A new version of a service worker cannot simply replace the running one. A page that loaded
    version 1 of the app's scripts may still request a file that only version 1 had, so the old
    worker has to keep serving that page. The browser therefore moves each worker through states,
    which <code>ServiceWorker.state</code> reports.
  </p>
  <Figure>
    <Diagram {...LIFECYCLE} />
    {#snippet caption()}The states of one service worker.{/snippet}
  </Figure>
  <StepList>
    <StepItem title="Install">
      The browser fires <code>install</code>. This is where a worker fills its cache. Passing a
      promise to <code>event.waitUntil()</code> keeps the step open until it settles; if it rejects,
      the install fails and the worker becomes <code>redundant</code>, so a half-filled cache never
      serves a page.
    </StepItem>
    <StepItem title="Waiting">
      The installed worker waits while an older version still controls any page. It activates when
      no page uses the old version any more, or at once when there was no old version.
    </StepItem>
    <StepItem title="Activate">
      The browser fires <code>activate</code>. The old version is gone, so this is where its caches
      can be deleted.
    </StepItem>
    <StepItem title="Control">
      A page keeps the controller it loaded with for its whole life. A page that opened before any
      worker was active stays uncontrolled until it reloads.
    </StepItem>
  </StepList>
  <p>
    Two calls shorten this. <code>self.skipWaiting()</code>, called in the waiting worker, makes it
    the active worker without waiting for the old pages to close. <code>clients.claim()</code>,
    called in an active worker, makes it the controller of every open page in its scope, and fires
    <code>controllerchange</code> on <code>navigator.serviceWorker</code> in each page it takes over.
  </p>
</DocsSection>

<DocsSection title={OFFLINE_SECTIONS.caches}>
  <p>
    Browsers have kept copies of responses for a long time, in the HTTP cache. That cache is filled
    and read by the browser, following the <code>Cache-Control</code> header of each response, and
    no script can list or fill it. A response marked <code>no-cache</code> may not be reused until the
    server confirms it is unchanged, and HTTP caching rules forbid serving it stale even when the server
    cannot be reached. Dokseo's host sends exactly that for every page:
  </p>
  <DocsCode label={`${HEADERS.file}, cache rules`} code={HEADERS.code} />
  <p>
    So the HTML document never comes from the HTTP cache offline. The hashed files under
    <code>/_app/immutable/</code> are cached for a year, but the browser may still evict them, and no
    code can check.
  </p>
  <p>
    The Cache API is a separate store that code controls. A page, a worker or a service worker opens
    a named cache with <code>caches.open(name)</code> and stores request and response pairs in it.
  </p>
  <Table size="sm" caption="The two caches side by side">
    <TableHeader>
      <TableRow>
        <TableHeaderCell></TableHeaderCell>
        <TableHeaderCell>HTTP cache</TableHeaderCell>
        <TableHeaderCell>Cache API</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableHeaderCell scope="row">Written by</TableHeaderCell>
        <TableCell>The browser, on each response</TableCell>
        <TableCell>Code: <code>put()</code>, <code>add()</code>, <code>addAll()</code></TableCell>
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row">Read by</TableHeaderCell>
        <TableCell>The browser, per the headers and the request's cache mode</TableCell>
        <TableCell>Code: <code>match()</code>, <code>keys()</code></TableCell>
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row">Expiry</TableHeaderCell>
        <TableCell><code>Cache-Control</code>, <code>Expires</code></TableCell>
        <TableCell>None. An entry stays until code deletes it.</TableCell>
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row">Visible to code</TableHeaderCell>
        <TableCell>No</TableCell>
        <TableCell>Yes, per origin, in named caches</TableCell>
      </TableRow>
    </TableBody>
  </Table>
  <p>
    Neither is permanent. The browser may delete an origin's Cache API data when storage runs low,
    usually all of the origin's data at once. The persistence grant from
    <code>navigator.storage.persist()</code> exempts an origin from that.
  </p>
  <p>
    One detail matters later: <code>caches.match()</code> on the global <code>caches</code>
    searches every cache the origin holds, in the order they were created, not one cache.
  </p>
</DocsSection>

<DocsSection title={OFFLINE_SECTIONS.strategies}>
  <p>
    A service worker serves each request from some order of cache and network, called a strategy.
    Which one fits depends on whether the file can change.
  </p>
  <ul>
    <li>
      <strong>Cache first</strong> serves from the cache and goes to the network only on a miss. It
      suits files whose name changes when their content does, such as
      <code>reader.3f9a1c.js</code>: a held copy of that name is always correct.
    </li>
    <li>
      <strong>Network first</strong> tries the network and falls back to the cache when the request fails.
      It suits the HTML document, which has one name across every deploy, so the network is the only way
      to get the newest one.
    </li>
  </ul>
  <p>
    Network first has a weak spot. On a connection that is up but delivers nothing, such as a weak
    train Wi-Fi, the request neither succeeds nor fails, and the app stays blank until the browser's
    own network timeout ends the request. A timeout fixes this: when the network has not responded
    after a few seconds, the cached copy is served instead. Other strategies exist, such as
    stale-while-revalidate, which serves from the cache and refreshes it in the background; Dokseo
    uses only these two.
  </p>
</DocsSection>

<DocsSection title={OFFLINE_SECTIONS.install}>
  <p>
    A web app manifest is a JSON file that a page links with
    <code>&lt;link rel="manifest"&gt;</code>. It describes the app as an installed app: its name,
    its icons, the URL it opens at, and how it is displayed. Dokseo's:
  </p>
  <DocsCode label={MANIFEST.file} code={MANIFEST.code} />
  <p>
    <code>id</code> is the app's identity, <code>start_url</code> the page it opens at, and
    <code>scope</code> the URLs that count as part of the app. <code>display: standalone</code>
    requests a window of its own without the browser's address bar.
  </p>
  <p>
    Installing means the app gets an icon on the device and opens in that window. Chromium browsers
    offer it from the address bar or the menu. On iPhone and iPad it is Share, then Add to Home
    Screen; a manifest with <code>display</code> set to <code>standalone</code> or
    <code>fullscreen</code> makes the result a Home Screen web app rather than a bookmark.
  </p>
  <p>
    On iOS and iPadOS, a Home Screen web app is not part of Safari. WebKit keeps its website data
    isolated from Safari's, so books imported in Safari are not in the installed app, and the other
    way round. Each one is a separate copy of Dokseo's storage on the same device.
  </p>
  <p>
    An installed app opens offline only if its service worker can serve the manifest and the icons
    too, which is why Dokseo precaches them, as
    <a href={offlineHref('shell')}>its service worker</a> shows.
  </p>
</DocsSection>

<DocsSection title={OFFLINE_SECTIONS.updates}>
  <p>
    The browser looks for a new version of a service worker at set moments: when a page calls
    <code>register()</code>, when code calls <code>registration.update()</code>, on a navigation to
    a page in scope, and on later requests and events once 24 hours have passed since the last
    check. A check fetches the script, by default without the HTTP cache, and compares it byte for
    byte with the installed one. Any difference starts an install of the new version.
  </p>
  <p>
    Two things keep that new version from reaching an open app. First, a single-page app moves
    between screens by changing the URL with the History API, which makes no navigation request, so
    an installed app left open for days may never trigger a check. Second, a found update only
    reaches the waiting state, and it stays there while the app's own page is open. On a phone an
    installed app is rarely closed completely.
  </p>
  <p>
    So the page needs code of its own to request checks, watch for a worker that is waiting, send it
    a message to skip waiting, and reload once the new worker controls the page.
  </p>
</DocsSection>
