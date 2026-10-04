<script lang="ts">
  import Diagram from '$lib/components/Diagram.svelte';
  import Figure from '$lib/components/Figure.svelte';
  import StepItem from '$lib/components/StepItem.svelte';
  import StepList from '$lib/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { FRAME_DIAGRAM } from './epub-diagrams';
  import {
    EPUB_SECTIONS,
    epubSectionHref,
    SECURITY_CHAPTERS_HREF,
    SECURITY_INHERIT_HREF,
    SECURITY_WEBKIT_HREF,
  } from './epub-sections';
  import { BOOK_PAGING, FLOW_STYLES, OPEN_SURFACE } from './epub-snippets';
  import type { FlowKit } from './flow-kit';
  import RenderDemo from './RenderDemo.svelte';

  type Props = { kit: FlowKit };

  let { kit }: Props = $props();

  const FOLIATE = 'https://github.com/johnfactotum/foliate-js';
</script>

<DocsSection title={EPUB_SECTIONS.foliate}>
  <p>
    <a href={FOLIATE}>foliate-js</a> is the rendering library of the Foliate e-book reader: plain
    JavaScript modules with no build step and no type declarations. Dokseo depends on version 1.0.1
    and declares the members it calls in <code>src/foliate-js.d.ts</code>. Three parts of it matter
    here.
  </p>
  <ul>
    <li>
      <code>view.js</code> exports <code>makeBook</code>, which reads a <code>File</code> into a
      book object (the EPUB parser lives in <code>epub.js</code>), and <code>View</code>, the
      <code>&lt;foliate-view&gt;</code> element that ties a book to a renderer, turns CFIs into places
      and reports where the reader is.
    </li>
    <li>
      <code>paginator.js</code> is the renderer for reflowable books, the
      <code>&lt;foliate-paginator&gt;</code> element. It loads chapters into frames, lays them out in
      columns and turns pages.
    </li>
    <li>
      <code>epubcfi.js</code> parses, builds and compares CFIs.
    </li>
  </ul>
  <p>
    Dokseo loads them with dynamic imports when a book opens, so they are not part of the code that
    starts the app. The whole of Dokseo's use of foliate-js sits behind one function, <code
      >openFlowSurface</code
    >:
  </p>
  <DocsCode label={OPEN_SURFACE.label} code={OPEN_SURFACE.code} />
  <p>
    It reads the book, hooks the sanitizer into every chapter load, moves spine items that have no
    body (an SVG page) out of the reading order, works out the book's writing mode, creates the
    view, applies Dokseo's styles and goes to the saved place, or to the start. What it returns is a <code
      >FlowSurface</code
    >: page turns, jumps, passage marks, restyling and <code>destroy</code>, with no foliate-js type
    in sight.
  </p>
</DocsSection>

<DocsSection title={EPUB_SECTIONS.flowing}>
  <p>
    The flow reader is the <code>flowing</code> domain, <code>src/lib/domains/flowing/</code>. It is
    a leaf: it imports no other domain, and the route composes it with the capture panel. Opening a
    book runs through four layers.
  </p>
  <StepList>
    <StepItem title="FlowViewer.svelte">
      The component. Its stage element opens the book in an attachment, wires taps, keys and the
      selection in every chapter document, and draws the header, the page bar and the dialogs.
    </StepItem>
    <StepItem title="FlowView">
      The view model in <code>flow-view.svelte.ts</code>. Its state is a union, <code>idle</code>,
      <code>opening</code>, <code>ready</code> or <code>failed</code>. It reads the book's file
      through the library's <code>readSource</code> use case, opens the surface, and saves the reading
      place half a second after the last move.
    </StepItem>
    <StepItem title="FlowSurface">
      <code>flow-surface.ts</code>, the wrapper around foliate-js shown above.
    </StepItem>
    <StepItem title="Pure helpers">
      Writing mode, styles, quotes, taps and keys, each in its own module with unit tests:
      <code>flow-writing-mode.ts</code>, <code>flow-styles.ts</code>, <code>flow-quote.ts</code>,
      <code>flow-turn.ts</code>.
    </StepItem>
  </StepList>
  <p>
    The EPUB demos call <code>openFlowSurface</code> and the capture function
    <code>selectedPassage</code> directly, imported from the flowing domain's <code>ui/</code>
    together with the probe that reads the theme's colors.
  </p>
</DocsSection>

<DocsSection title={EPUB_SECTIONS.frames}>
  <p>
    foliate-js shows each chapter in an <code>&lt;iframe&gt;</code> whose source is a
    <code>blob:</code> URL. Its loader reads the chapter out of the ZIP, rewrites every reference to
    a stylesheet, picture or font into a <code>blob:</code> URL of its own, and mints one more for
    the rewritten chapter. Dokseo sanitizes the markup with DOMPurify on the way, through the
    loader's
    <code>data</code> event. The security side of this, the sanitizer, the frame's
    <code>sandbox</code> and the policy a <code>blob:</code> document inherits, is on the security
    headers page under <a href={SECURITY_CHAPTERS_HREF}>EPUB chapters as blob frames</a> and
    <a href={SECURITY_INHERIT_HREF}>blob documents inherit the policy</a>.
  </p>
  <Figure>
    <Diagram
      label={FRAME_DIAGRAM.label}
      width={FRAME_DIAGRAM.width}
      height={FRAME_DIAGRAM.height}
      nodes={FRAME_DIAGRAM.nodes}
      edges={FRAME_DIAGRAM.edges}
    />
    {#snippet caption()}
      From Dokseo's stage to the columns. Both custom elements keep their insides in closed shadow
      roots.
    {/snippet}
  </Figure>
  <p>
    The frame is on Dokseo's origin, so the page can reach into it: Dokseo listens for pointer, key
    and selection events on each chapter document as foliate-js fires its <code>load</code> event,
    and it maps a point in the frame back to the stage with the frame element's bounding box,
    because a chapter's own coordinates run across the whole row of pages. One way this setup failed
    in production, on Safari, is told in
    <a href={SECURITY_WEBKIT_HREF}>the Safari frame-ancestors failure</a>.
  </p>
</DocsSection>

<DocsSection title={EPUB_SECTIONS.styles}>
  <p>
    A chapter arrives with the publisher's styles, and Dokseo has to lay its own on top: the theme's
    text color on a transparent page, the reader's text size and line spacing, and furigana on or
    off. The paginator offers one way in, <code>setStyles</code>. When it loads a chapter it adds
    two
    <code>style</code> elements to the chapter's head, one before the book's own stylesheets and one
    after them, and <code>setStyles</code> fills both. <code>flowStyles</code> builds the pair.
  </p>
  <DocsCode label={FLOW_STYLES.label} code={FLOW_STYLES.code} />
  <ul>
    <li>
      The first string goes before the book's styles, so the book can still override it: the color
      scheme, a transparent background and link colors.
    </li>
    <li>
      The second goes after them, so it beats book rules of the same specificity: the text color.
      Where the reader's choice has to win regardless, it adds <code>!important</code>: the
      selection colors, the root font size as a percentage, the line height of paragraphs, and, when
      furigana are off,
      <code>display: none</code> on <code>rt</code> and <code>rp</code>.
    </li>
    <li>
      Colors are plain values, not tokens, because custom properties from the page do not reach into
      the frame. <code>PageInkProbe.svelte</code> reads the resolved colors from hidden elements in the
      page and reads them again when the theme or the color scheme changes.
    </li>
  </ul>
  <p>
    A restyle reflows the chapter, and the place survives without help from Dokseo. The paginator
    keeps the range of text that was on screen as its anchor, and after any layout change it scrolls
    back to that range. It also keeps the styles for the next chapter it loads, so one call covers
    the whole book.
  </p>
</DocsSection>

<DocsSection title={EPUB_SECTIONS.settings}>
  <p>
    The text settings are three values: a text size from 80 to 135 percent, a line spacing from 1.3
    to 2, and whether furigana show. They are stored once for every book, and a change goes straight
    to
    <code>setStyles</code> on the open book. The demo below opens the sample book with the reader's own
    code and applies the same styles. It does not touch your stored settings.
  </p>
  <RenderDemo {kit} />
  <p>
    Switch to horizontal and measure the chapter frame: the frame is as wide as all the pages of the
    chapter, a whole number of pages wide. A vertical chapter's frame is one page wide, because its
    pages stack downward. The location under the book is the CFI that foliate-js reports for the
    range on screen, a range CFI with a common path, a start and an end. It changes when you resize
    the text, because the text on screen changes, and it is what Dokseo saves as the reading place.
  </p>
</DocsSection>

<DocsSection title={EPUB_SECTIONS.probe}>
  <p>
    foliate-js sets the paging axis per chapter, from that chapter's computed style. That broke a
    real book. Its text chapters were set <code>vertical-rl</code>, and its cover and illustrations
    were image chapters that declared no writing mode.
  </p>
  <StepList>
    <StepItem title="On a phone, the reader swipes up on a text page">
      The page turns forward, top to bottom, as a vertical chapter should.
    </StepItem>
    <StepItem title="The next chapter is an illustration">
      It computes as horizontal and left to right, so now a swipe to the left turns forward, against
      the page bar, the tap zones and the keys, which follow the spine's right-to-left order.
    </StepItem>
  </StepList>
  <p>
    The fix gives the whole book one paging axis. If the book is vertical, the second style string
    forces <code>writing-mode</code> on <code>html</code> and <code>body</code> of every chapter,
    and because the paginator applies the styles before it reads the chapter's direction, every
    chapter pages top to bottom. That needs the book's writing mode before the first chapter
    renders, which is what <code>bookPaging</code> works out:
  </p>
  <DocsCode label={BOOK_PAGING.label} code={BOOK_PAGING.code} />
  <StepList>
    <StepItem title="A declaration in the package">
      Some books include <code>&lt;meta name="primary-writing-mode" content="vertical-rl"/&gt;</code
      >
      in their package. It is not part of EPUB 3 and foliate-js does not parse it, but foliate-js keeps
      the parsed package document, and <code>declaredWritingMode</code> reads the value there.
    </StepItem>
    <StepItem title="A measurement of the first chapter with text">
      Otherwise <code>writing-mode-probe.ts</code> finds the first spine item whose body has text,
      loads it through foliate-js's own loader (so its stylesheets resolve and the sanitizer runs),
      renders it in a hidden <code>iframe</code> with <code>sandbox="allow-same-origin"</code> and
      no scripts, and reads <code>getComputedStyle(body).writingMode</code>, the value foliate-js
      would read. The same pass reads the chapter's direction.
    </StepItem>
    <StepItem title="Horizontal">If neither says vertical, the book is horizontal.</StepItem>
  </StepList>
  <p>
    The sample book declares nothing, so every EPUB demo runs the measurement. A first attempt at
    the bug took the swipe away from foliate-js and turned pages from Dokseo's own touch code
    instead. On the phone it sent pages back and forth and left foliate-js's turn lock stuck, which
    is the subject of <a href={epubSectionHref('lock')}>the turn lock</a>.
  </p>
</DocsSection>
