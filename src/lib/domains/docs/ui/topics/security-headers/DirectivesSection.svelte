<script lang="ts">
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import { CONTENT_SECURITY_POLICY } from '$lib/platform/security/content-security-policy';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { SECTIONS, sectionHref } from './sections';

  const KIT_CONFIG = `sveltekit({
  csp: { mode: 'hash', directives: CONTENT_SECURITY_POLICY },
})`;

  const REASONS: Readonly<Record<string, string>> = {
    'default-src': 'Blocks every kind of load the policy does not name.',
    'base-uri': 'No <base> element can change where relative URLs point.',
    'object-src': 'No <object> or <embed> plugin content.',
    'form-action': 'No form submission can navigate anywhere.',
    'frame-src': 'EPUB chapters are framed from blob: URLs. Without this no book opens.',
    'worker-src':
      "'self' for Dokseo's own worker files. blob: for zip.js, which starts its decompression workers from blob: URLs when it reads a ZIP archive.",
    'script-src':
      "Dokseo's own script files, WebAssembly compilation, and the hash of the one inline script in app.html, which applies the saved theme before the first paint. Never blob: or data:.",
    'style-src':
      "'unsafe-inline' for the style elements Dokseo and foliate-js put into every chapter, and for a style attribute in app.html. blob: for a book's own stylesheets.",
    'img-src':
      'Page images read back from storage as blob: URLs, and pictures inside books, which can be blob: or data: URLs.',
    'manifest-src': 'The web app manifest, so Dokseo can be installed.',
    'font-src': "Dokseo's self-hosted fonts, and fonts embedded in books as blob: or data: URLs.",
    'media-src': 'Audio and video inside EPUB books, as blob: URLs.',
    'connect-src': 'The model and runtime hosts. See the section on model downloads.',
  };

  const rows = Object.entries(CONTENT_SECURITY_POLICY).map(([name, sources]) => ({
    name,
    sources: Array.isArray(sources) ? sources.join(' ') : String(sources),
    reason: REASONS[name] ?? '',
  }));
</script>

<DocsSection title={SECTIONS.directives}>
  <p>
    Dokseo's directives live in one constant,
    <code>CONTENT_SECURITY_POLICY</code> in
    <code>src/lib/platform/security/content-security-policy.ts</code>, and
    <code>vite.config.ts</code> passes it to SvelteKit:
  </p>
  <DocsCode label="vite.config.ts, the csp option" code={KIT_CONFIG} />
  <p>
    In <code>hash</code> mode SvelteKit computes a SHA-256 hash of each inline script it writes into
    a page, such as its startup script, and adds it to <code>script-src</code>. The page can then
    run those exact scripts and no other inline script, with no <code>'unsafe-inline'</code>. A
    script SvelteKit does not write, such as the theme script in <code>app.html</code>, needs its
    hash listed by hand. SvelteKit writes keywords like <code>self</code> with their quotes.
  </p>
  <p>The table is rendered from the constant itself, so it lists exactly what the build uses:</p>
  <Table size="sm" caption="CONTENT_SECURITY_POLICY">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Directive</TableHeaderCell>
        <TableHeaderCell>Sources</TableHeaderCell>
        <TableHeaderCell>Why</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each rows as row (row.name)}
        <TableRow>
          <TableCell><code>{row.name}</code></TableCell>
          <TableCell><code>{row.sources}</code></TableCell>
          <TableCell>{row.reason}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    The <code>blob:</code> entries all come from one fact: EPUB chapters, their pictures, fonts and
    stylesheets reach the page as object URLs, described in
    <a href={sectionHref('chapters')}>EPUB chapters as blob frames</a>. <code>script-src</code> is
    the one directive that never gets <code>blob:</code>, because the blob URLs on a reading page
    hold content taken from books, and none of it may run as script.
  </p>
  <p>
    <code>content-security-policy.spec.ts</code> pins invariants such as these:
    <code>default-src</code>
    is
    <code>none</code>; <code>script-src</code> contains none of <code>blob:</code>,
    <code>data:</code>, <code>unsafe-inline</code> or <code>unsafe-eval</code>; every inline script
    in <code>app.html</code> has its hash listed; and the <code>blob:</code> sources that books need are
    still there.
  </p>
</DocsSection>
