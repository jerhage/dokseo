<script lang="ts">
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { CATALOG_PORT_HREF } from '../architecture/architecture-sections';
  import { REMOTE_SECTIONS, remoteHref } from './remote-sections';

  const TAILSCALE_COMMAND = `tailscale serve --bg http://127.0.0.1:8081`;

  const CADDYFILE = `:8081 {
	bind 127.0.0.1

	@allowed header_regexp Origin ^https://(reader\\.gongbu\\.me|localhost:5173)$
	header @allowed Access-Control-Allow-Origin {http.request.header.Origin}
	header @allowed Access-Control-Allow-Headers "Authorization, Range"
	header @allowed Access-Control-Expose-Headers "Content-Length, Content-Disposition"
	header Vary Origin

	@preflight method OPTIONS
	respond @preflight 204

	reverse_proxy 127.0.0.1:8080
}`;

  const CADDY_ALONE = `calibre.example.com {
	@allowed header_regexp Origin ^https://reader\\.gongbu\\.me$
	header @allowed Access-Control-Allow-Origin {http.request.header.Origin}
	header @allowed Access-Control-Allow-Headers "Authorization, Range"
	header @allowed Access-Control-Expose-Headers "Content-Length, Content-Disposition"
	header Vary Origin

	@preflight method OPTIONS
	respond @preflight 204

	reverse_proxy 127.0.0.1:8080
}`;
</script>

<DocsSection title={REMOTE_SECTIONS.proxy}>
  <p>
    Calibre's content server speaks <code>http://</code> and sends no CORS headers, so it cannot be
    used from Dokseo as it is (<a href={remoteHref('browser')}>What the browser requires</a>). A
    reverse proxy in front of it fixes both: it terminates HTTPS and adds the headers. Several
    setups work, and they follow.
  </p>
  <p>
    With Tailscale, <code>tailscale serve</code> gives the machine an HTTPS address of the form
    <code>machine.tailnet.ts.net</code>, with MagicDNS and HTTPS Certificates turned on for the
    tailnet. It cannot add response headers, so a small Caddy sits between it and the server and
    adds the CORS headers. Caddy listens on a local port, Tailscale serves that port over HTTPS:
  </p>
  <DocsCode label="Tailscale in front of Caddy" code={TAILSCALE_COMMAND} />
  <DocsCode label="Caddyfile for the local port" code={CADDYFILE} />
  <p>
    The <code>header_regexp</code> line lists the origins allowed to call the proxy. Put each origin
    Dokseo is served from in it, with its port when the port is not 443: the deployed address, and a
    local dev server such as <code>localhost:5173</code>.
  </p>
  <p>
    Caddy alone also works when the server has a public name: it gets its own certificate and adds
    the same headers.
  </p>
  <DocsCode label="Caddy with its own certificate" code={CADDY_ALONE} />
  <p>
    nginx does the same job: it terminates HTTPS, adds the same three headers with
    <code>add_header</code>, and answers the preflight request with an empty 204.
  </p>
  <p>
    <code>tailscale funnel</code> is for access from outside the tailnet. It makes the address reachable
    from the public internet, which makes the catalog's own password matter again.
  </p>
  <p>Calibre 9.15 behind Tailscale behaves like this.</p>
  <ul class="col gap-2">
    <li>
      Calibre sends no CORS headers. Without Caddy the browser blocks every response; with the
      Caddyfile above each feed and download carries <code>Access-Control-Allow-Origin</code>.
    </li>
    <li>
      Chromium 153 blocks a call from <code>https://reader.gongbu.me</code> to the
      <code>ts.net</code> address, which resolves to a Tailscale <code>100.x</code> address:
      "Permission was denied for this request to access the <code>local</code> address space". With the
      Local Network Access permission granted the same call returns 200. In Chrome this is a one-time
      permission prompt for the site. Dokseo makes its first call from the "Test connection" button, a
      click, and its error text for a blocked request names this prompt among the causes.
    </li>
    <li>A phone still needs Tailscale running to reach the catalog; downloaded books do not.</li>
  </ul>
</DocsSection>

<DocsSection title={REMOTE_SECTIONS.open}>
  <ul class="col gap-2">
    <li>
      Remembering a password on this device. It would be stored encrypted with AES-GCM, using a
      non-extractable WebCrypto key kept in IndexedDB. That protects the data at rest, and the app
      itself could still decrypt it, as any Basic-auth client must. Today the password is asked for
      again in each session.
    </li>
    <li>
      Series and volume nesting for downloaded books, from file metadata with the feed path as a
      fallback (<a href={remoteHref('series')}>Series: flat for now</a>).
    </li>
    <li>
      Handling of Chromium's Local Network Access beyond naming it in the connection error. The
      permission prompt belongs to the browser.
    </li>
    <li>
      OPDS 2.0 and other protocols. Every catalog speaks <code>opds1</code> today; a second protocol
      is a new adapter behind the same port (<a href={CATALOG_PORT_HREF}
        >Catalog protocols behind one port</a
      >).
    </li>
    <li>Sending reading progress back to the server, which belongs with sync.</li>
  </ul>
</DocsSection>
