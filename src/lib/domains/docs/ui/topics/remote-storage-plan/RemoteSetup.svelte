<script lang="ts">
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { REMOTE_SECTIONS, remoteHref } from './remote-sections';

  const TAILSCALE_COMMAND = `tailscale serve --bg 8081`;

  const CADDYFILE = `http://127.0.0.1:8081 {
	header {
		Access-Control-Allow-Origin "https://reader.gongbu.me"
		Access-Control-Allow-Headers "Authorization, Range"
		Access-Control-Allow-Methods "GET, OPTIONS"
	}
	@preflight method OPTIONS
	respond @preflight 204
	reverse_proxy 127.0.0.1:8080
}`;

  const CADDY_ALONE = `calibre.example.com {
	header {
		Access-Control-Allow-Origin "https://reader.gongbu.me"
		Access-Control-Allow-Headers "Authorization, Range"
		Access-Control-Allow-Methods "GET, OPTIONS"
	}
	@preflight method OPTIONS
	respond @preflight 204
	reverse_proxy 127.0.0.1:8080
}`;
</script>

<DocsSection title={REMOTE_SECTIONS.proxy}>
  <p>
    Calibre's content server speaks <code>http://</code> and sends no CORS headers, so it cannot be
    used from Dokseo as it is (<a href={remoteHref('browser')}>What the browser requires</a>). A
    reverse proxy in front of it fixes both: it terminates HTTPS and adds the headers. The setup
    guide shows several ways.
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
  <p>The probe has to confirm three things:</p>
  <ul class="col gap-2">
    <li>that Calibre sends no CORS headers;</li>
    <li>
      how Chromium treats a public page calling a <code>ts.net</code> address, which resolves to
      <code>100.64.0.0/10</code> (Private Network Access and Local Network Access);
    </li>
    <li>that a phone needs Tailscale running to reach the catalog.</li>
  </ul>
</DocsSection>

<DocsSection title={REMOTE_SECTIONS.decisions}>
  <p>Settled:</p>
  <ul class="col gap-2">
    <li>
      Books and the <code>reader</code> database stay unchanged. Catalogs and origins go in a new
      <code>catalogs</code> database, in a new non-leaf domain.
    </li>
    <li>
      No streaming. OPDS-PSE links, the extension that serves comic pages one by one, are ignored.
    </li>
    <li>
      No stored catalog listing, because stored data would drift from the server. The catalog view
      is online only.
    </li>
    <li>
      An update to a held book is offered, never applied on its own. Captures stay, and their
      anchors may shift.
    </li>
    <li>Calibre is tested first, since I run it. Komga comes later.</li>
    <li>
      Removing a downloaded book keeps it listed in the catalog as remote. Removing a catalog keeps
      its downloaded books in the library.
    </li>
  </ul>
  <p>Open or out of scope:</p>
  <ul class="col gap-2">
    <li>Chromium's Local Network Access, to look at.</li>
    <li>
      Series and volume nesting, after the flat first version, from file metadata with the feed path
      as a fallback.
    </li>
    <li>
      Sending reading progress back to the server, which belongs with sync and is out of scope.
    </li>
  </ul>
</DocsSection>
