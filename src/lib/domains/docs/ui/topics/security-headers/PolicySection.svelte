<script lang="ts">
  import DocsCode from '../../DocsCode.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { SECTIONS } from './sections';
  import ViolationProbe from './ViolationProbe.svelte';

  const EXAMPLE = `Content-Security-Policy: default-src 'none'; script-src 'self'; img-src 'self' blob:`;
</script>

<DocsSection title={SECTIONS.policy}>
  <p>
    Every script on a page runs with the full rights of the page's origin. It can read the page's
    storage, call its APIs and send what it finds to any server. Cross-site scripting, or XSS, is
    the attack where someone gets their own markup into a page, through a comment field or a file
    the page renders, and a <code>&lt;script&gt;</code> or an <code>onerror=</code> attribute in that
    markup runs as if the page had written it.
  </p>
  <p>
    A Content Security Policy (CSP) is a set of rules the server sends with the page. Each rule is a
    directive: a kind of load, followed by the sources allowed for it.
  </p>
  <DocsCode label="A small policy" code={EXAMPLE} />
  <ul>
    <li>
      <code>script-src 'self'</code> allows script files from the page's own origin and nothing
      else. An inline <code>&lt;script&gt;</code>, an <code>onclick=</code> attribute,
      <code>eval()</code> and <code>new Function()</code> are all blocked, because the list names no
      <code>'unsafe-inline'</code>
      and no <code>'unsafe-eval'</code>.
    </li>
    <li>
      <code>img-src 'self' blob:</code> allows images from the origin and from
      <code>blob:</code> URLs, the object URLs a page mints with <code>URL.createObjectURL</code>.
    </li>
    <li>
      <code>default-src 'none'</code> is the fallback for every fetch directive the policy leaves
      out, so fonts, frames, <code>fetch()</code> calls and the rest are blocked until a directive names
      them.
    </li>
  </ul>
  <p>
    Injected markup still lands in the page under this policy, but the script in it never runs. That
    is the point of a policy: it limits what an injection can do after every other defense has
    already failed.
  </p>
  <p>
    A blocked operation fails the way that kind of operation always fails: <code>eval</code> throws,
    a <code>fetch()</code> promise rejects, a script element stays inert. The document also receives
    a <code>securitypolicyviolation</code> event that names the directive. This page runs under Dokseo's
    own policy, so each button below tries something that policy blocks.
  </p>
  <DocsDemo label="Break the policy" resettable resetLabel="Clear">
    <ViolationProbe />
    {#snippet caption()}
      Each attempt runs in this page. Its events arrive a moment after the attempt. The fetch never
      reaches the network: the policy check runs before the request is sent.
    {/snippet}
  </DocsDemo>
</DocsSection>
