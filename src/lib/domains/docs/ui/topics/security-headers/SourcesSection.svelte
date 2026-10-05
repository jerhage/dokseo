<script lang="ts">
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { SECTIONS, sectionHref } from './sections';

  const PLUGIN = `const CROSS_ORIGIN_ISOLATION: Readonly<Record<string, string>> = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

function isolate(server: ViteDevServer | PreviewServer): void {
  server.middlewares.use((_request, response, next) => {
    for (const [header, value] of Object.entries(CROSS_ORIGIN_ISOLATION)) {
      response.setHeader(header, value);
    }
    next();
  });
}

function crossOriginIsolation(): Plugin {
  return {
    name: 'cross-origin-isolation',
    configureServer: isolate,
    configurePreviewServer: isolate,
  };
}`;

  const HEADERS_FILE = `/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  X-Content-Type-Options: nosniff
  Content-Security-Policy: frame-ancestors 'self'
  Cache-Control: no-cache`;
</script>

<DocsSection title={SECTIONS.sources}>
  <p>
    Dokseo runs in three setups: Vite's dev server, Vite's preview server over a production build,
    and the deployed site, which is static files on Cloudflare. Each one gets the isolation headers
    and the policy from a different place.
  </p>
  <p>
    In development and preview, a small Vite plugin in <code>vite.config.ts</code> adds COOP and COEP
    to every response, documents, scripts and worker files alike:
  </p>
  <DocsCode label="vite.config.ts, the isolation plugin" code={PLUGIN} />
  <p>
    I set the headers through middleware because, in my setup, Vite's own
    <code>server.headers</code> and <code>preview.headers</code> options did not reach the HTML
    document in preview. The check that settles it is reading the response, as the demo in
    <a href={sectionHref('delivery')}>header or meta tag</a> does.
  </p>
  <p>
    Both servers render each page on request, so SvelteKit sends the policy as a
    <code>content-security-policy</code> response header. A production build is different.
    <code>adapter-static</code> prerenders the single <code>index.html</code> that every route falls
    back to, and SvelteKit writes the policy into a prerendered page as a
    <code>&lt;meta http-equiv&gt;</code> element, since a static file cannot set its own headers.
  </p>
  <p>
    The deployed site gets everything else from <code>static/_headers</code>, which the build copies
    into its output and Cloudflare applies to every matching response:
  </p>
  <DocsCode label="static/_headers, the rule for every path" code={HEADERS_FILE} />
  <p>
    <code>frame-ancestors</code> is the one directive here, because a meta policy ignores it. The meta
    tag and the header are two policies, and the browser enforces both.
  </p>
  <Table size="sm" caption="Where each header comes from">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Setup</TableHeaderCell>
        <TableHeaderCell>COOP and COEP</TableHeaderCell>
        <TableHeaderCell>CSP</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell><code>deno task dev</code></TableCell>
        <TableCell>The isolation plugin</TableCell>
        <TableCell>A header from SvelteKit</TableCell>
      </TableRow>
      <TableRow>
        <TableCell><code>deno task preview</code></TableCell>
        <TableCell>The isolation plugin</TableCell>
        <TableCell>A header from SvelteKit</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Deployed</TableCell>
        <TableCell><code>static/_headers</code></TableCell>
        <TableCell>
          A meta element in <code>index.html</code>, plus <code>frame-ancestors</code> from
          <code>static/_headers</code>
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
  <p>
    Neither local server sends <code>frame-ancestors</code>. Only the deployed site does, so the
    failure in <a href={sectionHref('webkit')}>the last section</a> cannot be reproduced on either local
    server.
  </p>
  <p>
    When the network fails or takes longer than three seconds, Dokseo's service worker serves the
    app's page from its cache. The Cache API stores a whole response, headers included, so a page
    served from the cache is still isolated.
  </p>
</DocsSection>
