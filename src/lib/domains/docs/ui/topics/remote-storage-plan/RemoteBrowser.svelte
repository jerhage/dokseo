<script lang="ts">
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { REMOTE_SECTIONS, SECURITY_DIRECTIVES_HREF, remoteHref } from './remote-sections';
  import { CONNECT_SOURCES } from './remote-snippets';
</script>

<DocsSection title={REMOTE_SECTIONS.goal}>
  <p>
    Every book in Dokseo is a file on the device. A catalog is a second source for those files: a
    server that speaks OPDS 1.2, a feed format that servers such as Calibre use to list their books.
    The reader adds a catalog in Settings, browses it in a tab of the library, and downloads the
    books they want. A downloaded book is written to OPFS like any uploaded file, so it works
    offline, as the rest of the library does.
  </p>
  <p>
    A book on the server is not opened from there. "Open" on a remote entry exists only once the
    file is held, and reading a book means downloading it first. There is no streaming, and the
    OPDS-PSE links that serve comic pages one by one are ignored. That keeps every capture on a held
    book.
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

<DocsSection title={REMOTE_SECTIONS.calibre}>
  <p>
    Dokseo's reader of OPDS feeds was written against Calibre 9.15, and copes with each place where
    that server departs from the specification.
  </p>
  <ul class="col gap-2">
    <li>
      A navigation entry's link has no <code>rel</code>. The reader finds it by a
      <code>type</code> that contains <code>profile=opds-catalog</code>.
    </li>
    <li>
      Every <code>href</code> is relative. Each is resolved against the feed's URL, and the braces
      of a <code>&#123;searchTerms&#125;</code> template are restored afterwards, because
      <code>new URL</code> encodes them.
    </li>
    <li>
      The search link is an inline template with <code>rel="search"</code>, not an OpenSearch
      description document.
    </li>
    <li>
      The cover sits under the standard <code>http://opds-spec.org/image</code> rel and under
      Calibre's own <code>http://opds-spec.org/cover</code>. The standard one is read first.
    </li>
    <li>
      <code>dc:language</code> is a three-letter code such as <code>jpn</code>, so the reader maps
      <code>jpn</code>, <code>kor</code> and <code>eng</code> itself.
    </li>
    <li>
      The media type of a feed does not say its kind reliably. A feed with any acquisition link is
      an acquisition feed.
    </li>
    <li>
      The root lists "Library: calibre", a link back to the root feed under another address. A feed
      whose Atom <code>id</code> is already on the path replaces that crumb instead of adding one.
    </li>
    <li>
      A download answers with <code>Content-Disposition</code> holding both a plain
      <code>filename</code> and a percent-encoded <code>filename*</code>. The File takes the
      <code>filename*</code> name, then <code>filename</code>, then the entry's title with the
      extension of its media type.
    </li>
  </ul>
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
      <code>http://localhost</code> and <code>http://127.0.0.1</code> are exempt. A server on the
      home network therefore needs HTTPS in front of it, and the add form refuses any other
      <code>http://</code> address.
    </li>
    <li>
      The server has to answer with CORS headers: <code>Access-Control-Allow-Origin</code> for the
      app's origin, and permission for the <code>Authorization</code> header (and
      <code>Range</code>, if requests use it). Sending <code>Authorization</code> makes every
      request preflighted, so the server also has to answer the <code>OPTIONS</code> request. Without
      the headers the browser discards the response.
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
    A cross-origin response exposes only the headers CORS allows by default. <code
      >Content-Length</code
    >
    is one of them and <code>Content-Disposition</code> is not, so the proxy has to expose it for the
    file to keep the server's name.
  </p>
  <p>
    A rejected <code>fetch</code> is a <code>TypeError</code> for a missing CORS header, a blocked
    local address, mixed content, a DNS failure and a dropped connection alike, and the page cannot
    tell them apart. The client therefore splits only on whether the browser reports being online:
    online is <code>blocked</code>, offline is <code>offline</code>. Its other outcomes are
    <code>unauthorized</code>
    (401 or 403),
    <code>not-found</code>, <code>server-error</code> and <code>aborted</code>. The connection test
    names the three likely causes of <code>blocked</code>.
  </p>
  <p>
    Chromium's Local Network Access adds a permission step when a public page calls a private
    address, and a Tailscale address counts as one. The <a href={remoteHref('proxy')}
      >proxy section</a
    >
    gives what happens.
  </p>
</DocsSection>
