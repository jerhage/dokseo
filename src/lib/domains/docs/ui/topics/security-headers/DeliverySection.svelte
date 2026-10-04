<script lang="ts">
  import DocsCode from '../../DocsCode.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import HeaderProbe from './HeaderProbe.svelte';
  import { SECTIONS, sectionHref } from './sections';

  const META = `<meta http-equiv="content-security-policy" content="default-src 'none'; script-src 'self'">`;
</script>

<DocsSection title={SECTIONS.delivery}>
  <p>
    A policy reaches the browser in one of two ways. The server can send it as a
    <code>Content-Security-Policy</code> response header, or the page can include it in its own
    markup as a <code>&lt;meta http-equiv&gt;</code> element:
  </p>
  <DocsCode label="A policy in the page's markup" code={META} />
  <p>
    The meta form exists for pages served from hosts that cannot set headers. It is weaker in three
    ways, all stated in the CSP specification:
  </p>
  <ul>
    <li>
      It applies only to what comes after it in the document. A script that loads before the
      <code>&lt;meta&gt;</code> element is parsed is not covered.
    </li>
    <li>
      It ignores <code>frame-ancestors</code>, <code>sandbox</code> and <code>report-uri</code>.
      <code>frame-ancestors</code> says which pages may embed this one, and that check runs on the response
      before any of the page's markup exists, so only a header can deliver it.
    </li>
    <li>It cannot be report-only. A report-only policy exists only as a header.</li>
  </ul>
  <p>
    Both forms can be present at once. The browser enforces every policy it receives, so a load has
    to pass all of them. Dokseo uses both, for the reason given in
    <a href={sectionHref('sources')}>where Dokseo's headers come from</a>.
  </p>
  <p>
    A running page cannot read its own response headers, and the DOM has no API that lists the
    policies in force. Fetching the page's own URL again returns a fresh response, and its headers
    can be read from there. This page is served by Vite's dev server, so what comes back is the
    development setup.
  </p>
  <DocsDemo label="The headers on this page">
    <HeaderProbe />
    {#snippet caption()}
      SvelteKit adds a hash to <code>script-src</code> for its own startup script, beside the one Dokseo
      lists for its theme script.
    {/snippet}
  </DocsDemo>
</DocsSection>
