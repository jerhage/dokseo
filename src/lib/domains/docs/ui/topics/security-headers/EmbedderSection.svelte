<script lang="ts">
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { SECTIONS } from './sections';

  const OPT_IN = `Cross-Origin-Resource-Policy: cross-origin`;
</script>

<DocsSection title={SECTIONS.embedder}>
  <p>
    Every request a page makes has a mode. <code>fetch()</code> uses <code>cors</code> by default,
    and so does an <code>&lt;img&gt;</code> or <code>&lt;script&gt;</code> with a
    <code>crossorigin</code> attribute. A plain <code>&lt;img src&gt;</code>,
    <code>&lt;script src&gt;</code> or <code>&lt;link rel="stylesheet"&gt;</code> uses
    <code>no-cors</code>. A <code>no-cors</code> response from another origin is opaque: the page can
    display the image or run the script but cannot read the bytes, so before COEP no server had to agree
    to it.
  </p>
  <p>
    Under <code>require-corp</code>, a cross-origin response has to include its agreement. The Fetch
    standard runs the check only on opaque responses, so the mode determines what the server must
    send:
  </p>
  <Table size="sm" caption="What lets a cross-origin response load under require-corp">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Request</TableHeaderCell>
        <TableHeaderCell>What the response needs</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell><code>cors</code> mode</TableCell>
        <TableCell>
          A passing CORS check, such as <code>Access-Control-Allow-Origin</code> naming the page's
          origin or <code>*</code>. COEP adds nothing.
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell><code>no-cors</code> mode</TableCell>
        <TableCell>
          A <code>Cross-Origin-Resource-Policy</code> header that admits the page:
          <code>cross-origin</code>, or <code>same-site</code> for a page on the same site.
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Same origin</TableCell>
        <TableCell>Nothing.</TableCell>
      </TableRow>
    </TableBody>
  </Table>
  <DocsCode label="The header a no-cors response must include" code={OPT_IN} />
  <p>A page that worked before isolation can break like this:</p>
  <ol>
    <li>
      A developer adds a stylesheet from a font service:
      <code>&lt;link rel="stylesheet" href="https://fonts.example/css"&gt;</code>, with no
      <code>crossorigin</code> attribute, so the request is <code>no-cors</code>.
    </li>
    <li>The font service's response has no <code>Cross-Origin-Resource-Policy</code> header.</li>
    <li>
      The browser blocks the stylesheet, and the console shows a failed network request. The page
      renders in fallback fonts, and the <code>&lt;link&gt;</code> element itself looks correct.
    </li>
    <li>
      Adding <code>crossorigin</code> to the link makes it a <code>cors</code> request, which loads whenever
      the font service's response passes CORS.
    </li>
  </ol>
  <p>
    The rule: on an isolated page, request every cross-origin resource in <code>cors</code> mode, or
    only from servers that send <code>Cross-Origin-Resource-Policy</code>.
  </p>
</DocsSection>
