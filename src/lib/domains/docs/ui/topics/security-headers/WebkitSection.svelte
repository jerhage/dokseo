<script lang="ts">
  import Diagram from '$lib/components/Diagram.svelte';
  import type { DiagramBox } from '$lib/components/diagram';
  import Figure from '$lib/components/Figure.svelte';
  import StepItem from '$lib/components/StepItem.svelte';
  import StepList from '$lib/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { SECTIONS, sectionHref } from './sections';

  const BEFORE = `Content-Security-Policy: frame-ancestors 'none'`;
  const AFTER = `Content-Security-Policy: frame-ancestors 'self'`;

  const header: DiagramBox = {
    kind: 'box',
    x: 70,
    y: 8,
    width: 220,
    height: 52,
    label: 'Response header',
    detail: "frame-ancestors 'none'",
    tone: 'accent',
  };
  const page: DiagramBox = {
    kind: 'box',
    x: 70,
    y: 104,
    width: 220,
    height: 52,
    label: 'Dokseo page',
    detail: 'policy container',
    tone: 'primary',
  };
  const chapter: DiagramBox = {
    kind: 'box',
    x: 70,
    y: 200,
    width: 220,
    height: 52,
    label: 'Chapter frame',
    detail: 'blob:, copied policies',
  };
  const check: DiagramBox = {
    kind: 'box',
    x: 70,
    y: 296,
    width: 220,
    height: 52,
    label: 'frame-ancestors check',
    detail: 'ancestor: Dokseo page',
    tone: 'accent',
  };
</script>

<DocsSection title={SECTIONS.webkit}>
  <p>
    <code>frame-ancestors</code> lists the pages allowed to embed a document. Set to
    <code>'none'</code>, it is the usual defense against clickjacking, where another site loads a
    page in an invisible frame and gets someone to click on it. Dokseo first shipped it that way,
    and in Safari no EPUB book would open.
  </p>
  <DocsCode label="static/_headers, the first version" code={BEFORE} />
  <Figure>
    <Diagram
      label="The response header with frame-ancestors 'none' reaches the Dokseo page, the page's policies are copied into the blob chapter frame, and WebKit runs the frame-ancestors check on the chapter with the Dokseo page as its ancestor"
      width={360}
      height={356}
      nodes={[header, page, chapter, check]}
      edges={[
        { from: header, to: page, label: 'arrives with' },
        { from: page, to: chapter, label: 'copied into' },
        { from: chapter, to: check, label: 'WebKit runs' },
      ]}
    />
    {#snippet caption()}
      The check runs against the chapter's own copy of the header policy.
    {/snippet}
  </Figure>
  <StepList>
    <StepItem title="A reader opens an EPUB in Safari">
      On an iPad, in the browser or from the home screen. foliate-js mints a <code>blob:</code> URL
      for the first chapter and sets it as the frame's <code>src</code>.
    </StepItem>
    <StepItem title="The chapter receives the page's policies">
      Its policy container is a copy of the page's, and that includes the header policy with
      <code>frame-ancestors 'none'</code>.
    </StepItem>
    <StepItem title="WebKit blocks the chapter">
      It checks the copied <code>frame-ancestors</code> against the chapter's ancestor, which is the
      Dokseo page. <code>'none'</code> admits no ancestor. The console shows: Refused to load blob:… because
      it does not appear in the frame-ancestors directive.
    </StepItem>
    <StepItem title="The frame fires load anyway">
      As in <a href={sectionHref('frames')}>the frame probe</a>, a blocked frame still fires
      <code>load</code>. Here its <code>contentDocument</code> is <code>null</code>.
    </StepItem>
    <StepItem title="foliate-js throws inside its listener">
      Its <code>load</code> listener passes the document to a callback that reads
      <code>doc.head</code>, which throws: null is not an object (evaluating 'e.head'). The promise
      that <code>View.load</code> returns resolves only at the end of that listener, so it never settles.
    </StepItem>
    <StepItem title="The reader stays on Opening this book…">
      Nothing fails visibly. The loading curtain never lifts.
    </StepItem>
  </StepList>
  <p>
    Chromium never blocked the chapter, so the same book opened in Chrome. The two engines apply the
    same header differently. As I read the HTML standard, the check that applies <code
      >frame-ancestors</code
    >
    to a new document uses that document's policy container, and a <code>blob:</code> document's
    container is the copy, which makes WebKit's behavior the one the standard describes. I
    reproduced it with Playwright's WebKit against the production build served with
    <code>_headers</code>, on iPad, iPhone and desktop setups, with and without the service worker.
  </p>
  <p>The fix is one word:</p>
  <DocsCode label="static/_headers, now" code={AFTER} />
  <p>
    <code>'self'</code> in the chapter's copy means Dokseo's origin, because a <code>blob:</code>
    URL has the origin of the page that minted it. The chapter's ancestor is Dokseo's own page, so the
    check passes. A page on any other origin is still blocked from framing Dokseo, which I checked in
    both WebKit and Chromium.
  </p>
  <p>
    One weakness remains. Any chapter frame that fails to load leaves foliate-js's
    <code>load()</code> unsettled, so the reader would again wait on the curtain with no message. Dokseo
    has no timeout around it yet.
  </p>
  <p>
    The rule: a header directive is inherited by every <code>blob:</code> frame and worker the page
    creates, so test each one in WebKit as well as Chromium, on a server that sends the production
    headers. And treat a frame's <code>load</code> event as the end of an attempt, not as proof that its
    document arrived.
  </p>
</DocsSection>
