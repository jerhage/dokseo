<script lang="ts">
  import DocsCode from '../../DocsCode.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import FrameProbe from './FrameProbe.svelte';
  import { CHAPTER_DOCUMENT } from './probes';
  import { SECTIONS, sectionHref } from './sections';
</script>

<DocsSection title={SECTIONS.frames}>
  <p>
    A document loaded from a <code>blob:</code>, <code>data:</code> or <code>about:</code> URL
    arrives with no response headers, so it has nowhere of its own to get a policy from. The HTML
    standard gives it a copy of the policy container of the document that started the navigation.
    For a <code>blob:</code> URL that is the page that minted it. The copy holds every policy that page
    received, header and meta alike, with every directive in them.
  </p>
  <p>
    That makes a blob document a reasonable place to show markup the page did not write: whatever
    the page's policy blocks, the framed document blocks too. The probe below frames this document
    from a <code>blob:</code> URL:
  </p>
  <DocsCode label="The framed document" code={CHAPTER_DOCUMENT} />
  <p>
    The <code>sandbox</code> attribute is a separate restriction on a frame. An empty
    <code>sandbox</code> gives the framed document an opaque origin and blocks its scripts, and each
    token lifts one restriction. <code>allow-scripts</code> with <code>allow-same-origin</code>
    lifts the two that matter: a same-origin document with both can reach its own
    <code>&lt;iframe&gt;</code> element through its parent and remove the attribute. Chromium logs a warning
    when a frame gets that pair. The inherited policy is unaffected either way.
  </p>
  <DocsDemo label="Three frames">
    <FrameProbe />
    {#snippet caption()}
      The frames are hidden; the page reads each one when its <code>load</code> event fires. The
      third URL is same-origin, and <code>frame-src blob:</code> blocks it.
    {/snippet}
  </DocsDemo>
  <p>
    The first two rows show the inheritance: the frame's inline script did not run, with or without
    the sandbox, because the copied <code>script-src</code> has no <code>'unsafe-inline'</code>.
  </p>
  <p>
    The third row shows something easy to miss. A frame the policy blocks still fires
    <code>load</code>. In Chromium its <code>contentDocument</code> is <code>null</code>; in WebKit
    it is an empty document. Code that waits for <code>load</code> and then reads the document gets
    <code>null</code> or an empty page, and no <code>error</code> event fires. Dokseo's EPUB reader
    hit exactly that in Safari, as told in
    <a href={sectionHref('webkit')}>the Safari frame-ancestors failure</a>.
  </p>
</DocsSection>
