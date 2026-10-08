<script lang="ts">
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { REMOTE_SECTIONS, SECURITY_DIRECTIVES_HREF, remoteHref } from './remote-sections';
  import { CONNECT_SOURCES } from './remote-snippets';
</script>

<DocsSection title={REMOTE_SECTIONS.goal}>
  <p>
    Today every book in Dokseo starts as a file on the device. The plan adds a second source:
    catalogs that speak OPDS 1.2, a feed format that servers such as Calibre use to list their
    books. A reader adds a catalog, browses it, and downloads the books they want. A downloaded book
    is written to OPFS like any uploaded file, so it works offline, as the rest of the library does.
  </p>
  <p>
    A book on the server is not opened from there. "Read" on a remote entry downloads the file
    first, then opens the held book. There is no streaming: reading a book means downloading it.
    That keeps every capture on a held book, as it is today.
  </p>
</DocsSection>

<DocsSection title={REMOTE_SECTIONS.opds}>
  <p>
    OPDS 1.2 is Atom, an XML feed format. A feed comes in two kinds, told apart by the
    <code>kind</code> parameter of its media type. A navigation feed (<code
      >application/atom+xml;profile=opds-catalog;kind=navigation</code
    >) links to other feeds and lists no books. An acquisition feed (<code>kind=acquisition</code>)
    lists book entries. A single entry can also be fetched alone, as
    <code>application/atom+xml;type=entry</code>.
  </p>
  <p>
    An entry has an <code>atom:id</code>, which the specification requires to be stable, a title, an
    <code>updated</code>
    date, authors, and optionally <code>dc:identifier</code>,
    <code>dc:language</code>, a summary and categories. A partial entry links to the complete one
    with the rel <code>alternate</code>. The file itself sits behind an acquisition link, whose rel
    starts with <code>http://opds-spec.org/acquisition</code> and whose <code>type</code> is the
    file's media type. Covers use the rels <code>http://opds-spec.org/image</code> and
    <code>/image/thumbnail</code>. Feeds page with <code>next</code> and <code>previous</code>
    links, and can offer search through OpenSearch and facets.
  </p>
  <p>
    There is no series element and no volume order. A server that has series shows them as
    navigation: a "Series" feed that leads to one acquisition feed per series, in the feed's own
    order. Access control is HTTP Basic over TLS at minimum, and a server answers 401 or 403 when a
    request is not authorized.
  </p>
</DocsSection>

<DocsSection title={REMOTE_SECTIONS.browser}>
  <p>
    Dokseo is a static app with no server of its own, so every request to a catalog goes from the
    reader's browser straight to the catalog's server. The browser sets four conditions on that.
  </p>
  <ul class="col gap-2">
    <li>
      Dokseo has to run on HTTPS: the service worker, OPFS, <code>crypto.subtle</code> and cross-origin
      isolation all need it.
    </li>
    <li>
      An HTTPS page cannot fetch an <code>http://</code> address. That is mixed content. Only
      <code>http://localhost</code> and <code>http://127.0.0.1</code> are exempt. A server on the home
      network therefore needs HTTPS in front of it.
    </li>
    <li>
      The server has to answer with CORS headers: <code>Access-Control-Allow-Origin</code> for the
      app's origin, and permission for the <code>Authorization</code> header (and
      <code>Range</code>, if requests use it). Without them the browser discards the response.
    </li>
    <li>
      The content security policy has to allow the request. A catalog's origin is chosen at run
      time, and the policy is static.
    </li>
  </ul>
  <p>
    <code>connect-src</code> allows the app itself, the model hosts and any HTTPS origin, and the catalog
    client fetches catalog origins:
  </p>
  <DocsCode label={CONNECT_SOURCES.label} code={CONNECT_SOURCES.code} />
  <p>
    Because <code>https:</code> is listed, any HTTPS catalog works. Covers and pages are fetched
    with <code>fetch()</code> and shown as <code>blob:</code> URLs, which leaves
    <code>img-src</code> closed and needs no cross-origin resource policy header under COEP. The
    section on
    <a href={SECURITY_DIRECTIVES_HREF}>Dokseo's policy, directive by directive</a> explains each directive.
  </p>
  <p>
    Chromium's Local Network Access adds a permission step when a public page calls a private
    address, and a Tailscale address counts as one. The <a href={remoteHref('proxy')}
      >proxy section</a
    >
    gives what the probe found.
  </p>
</DocsSection>
