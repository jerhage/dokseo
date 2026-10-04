<script lang="ts">
  import Diagram from '$lib/components/Diagram.svelte';
  import Figure from '$lib/components/Figure.svelte';
  import StepItem from '$lib/components/StepItem.svelte';
  import StepList from '$lib/components/StepList.svelte';
  import { FIRST_EDITION, PACKAGE_PATH, sampleEpubEntries } from '../../../domain/sample-epub';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import ArchiveDemo from './ArchiveDemo.svelte';
  import CfiReader from './CfiReader.svelte';
  import { ARCHIVE_DIAGRAM, COLUMNS_DIAGRAM } from './epub-diagrams';
  import { EPUB_SECTIONS, epubSectionHref } from './epub-sections';
  import { COLUMNIZE, GET_DIRECTION, GO_LEFT_RIGHT } from './epub-snippets';

  const EPUB_SPEC = 'https://www.w3.org/TR/epub-33/';
  const CFI_SPEC = 'https://idpf.org/epub/linking/cfi/';

  const decoder = new TextDecoder();
  const files = new Map(
    sampleEpubEntries(FIRST_EDITION).map((entry) => [entry.path, decoder.decode(entry.bytes)]),
  );
  const opf = files.get(PACKAGE_PATH) ?? '';
  const container = files.get('META-INF/container.xml') ?? '';
</script>

<DocsSection title={EPUB_SECTIONS.archive}>
  <p>
    An EPUB file is a ZIP archive. Rename one to <code>.zip</code> and any unzip tool lists what is
    inside: one XHTML file per chapter, stylesheets, pictures and fonts, and a few files that
    describe the book. The <a href={EPUB_SPEC}>EPUB 3.3 specification</a> fixes how a reading program
    finds its way in.
  </p>
  <StepList>
    <StepItem title="The mimetype entry">
      The first file in the archive must be <code>mimetype</code>, stored without compression and
      without a ZIP extra field, holding exactly <code>application/epub+zip</code>. A ZIP local file
      header is 30 bytes long and the file name follows it, so in every valid EPUB the word
      <code>mimetype</code> starts at byte 30 and the media type follows at byte 38. A program can recognize
      the format from those bytes without unzipping anything.
    </StepItem>
    <StepItem title="The container file">
      <code>META-INF/container.xml</code> has a <code>rootfile</code> element whose
      <code>full-path</code> names the package document.
    </StepItem>
    <StepItem title="The package document">
      The package lists every other file and puts the chapters in reading order.
    </StepItem>
  </StepList>
  <Figure>
    <Diagram
      label={ARCHIVE_DIAGRAM.label}
      width={ARCHIVE_DIAGRAM.width}
      height={ARCHIVE_DIAGRAM.height}
      nodes={ARCHIVE_DIAGRAM.nodes}
      edges={ARCHIVE_DIAGRAM.edges}
    />
    {#snippet caption()}The way in, from the first entry to the chapters.{/snippet}
  </Figure>
  <p>
    The demos on this page use a small Japanese novella written for them, three chapters long. The
    page builds the EPUB from strings when it loads and never reads a book from your library.
  </p>
  <ArchiveDemo />
  <DocsCode label="META-INF/container.xml in the sample" code={container} />
</DocsSection>

<DocsSection title={EPUB_SECTIONS.package}>
  <p>
    The package document is XML, usually with an <code>.opf</code> extension. Its root
    <code>package</code> element has three required children, in this order.
  </p>
  <ul>
    <li>
      <code>metadata</code> holds Dublin Core elements. <code>dc:identifier</code>,
      <code>dc:title</code> and <code>dc:language</code> are required, and so is a
      <code>meta</code> with the property <code>dcterms:modified</code>.
    </li>
    <li>
      <code>manifest</code> lists every file in the publication: an <code>id</code>, an
      <code>href</code> relative to the package, and a <code>media-type</code>. The item with
      <code>properties="nav"</code> is the navigation document, the table of contents every EPUB 3 book
      must have.
    </li>
    <li>
      <code>spine</code> is the reading order: one <code>itemref</code> per content document, naming
      a manifest id. Its <code>page-progression-direction</code> is <code>ltr</code>,
      <code>rtl</code> or <code>default</code>, and an <code>itemref</code> marked
      <code>linear="no"</code> sits outside the main reading order.
    </li>
  </ul>
  <DocsCode label="OEBPS/package.opf in the sample, as generated" code={opf} />
</DocsSection>

<DocsSection title={EPUB_SECTIONS.layouts}>
  <p>
    A <code>meta</code> with the property <code>rendition:layout</code> picks one of two kinds of
    book. <code>reflowable</code>, the default, has no pages of its own: the text flows to the size
    of the screen and the font the reader chose, and the reading program cuts it into pages.
    <code>pre-paginated</code>, or fixed layout, gives each spine item fixed dimensions, one page
    per document, which is how most manga and picture books are made.
  </p>
  <p>
    Dokseo reads the package when a book is imported, with a small XML parser in the library domain
    (<code>readEpubPackage</code>, run in the demo under
    <a href={epubSectionHref('title')}>the title from the metadata</a>). An EPUB whose every spine
    item is one full-page picture opens in the image reader, page by page, like a CBZ. A reflowable
    EPUB opens in the flow reader, which is the subject of the rest of this page. A fixed-layout
    EPUB that is not one picture per page is refused, and the message says that only an EPUB of one
    full-page image per page can be read yet.
  </p>
</DocsSection>

<DocsSection title={EPUB_SECTIONS.isolation}>
  <p>
    A chapter is a whole XHTML document with its own <code>head</code>, its own stylesheets and
    sometimes scripts. Book CSS is written as if the book owned the page: rules on
    <code>html</code>, <code>body</code> and <code>p</code>, sizes in <code>rem</code>. Suppose a
    reader pasted a chapter's markup into its own document. The book's <code>p</code> rule would restyle
    the reader's settings dialog, the reader's own rules would restyle the book, and a script in the chapter
    would run as part of the reader. There are three ways to show a chapter, each with a cost.
  </p>
  <ul>
    <li>
      <strong>Insert the markup into the page.</strong> The simplest, with no separation in either direction.
    </li>
    <li>
      <strong>Put it in a shadow root.</strong> Selectors stop at the boundary both ways. But a
      shadow root has no <code>html</code> or <code>body</code> of its own for the book's rules to match,
      and the chapter shares the page's window: its viewport, its media queries and its scripts.
    </li>
    <li>
      <strong>Load it in an iframe.</strong> The chapter gets its own document, cascade and window. The
      costs: loading is asynchronous, events stay in the document they happen in (a click in the frame
      never reaches the page), and a point in the frame has to be translated into the page's coordinates.
    </li>
  </ul>
  <p>
    foliate-js, the library Dokseo renders EPUBs with, loads every chapter in an iframe, so Dokseo
    pays those costs: <a href={epubSectionHref('lock')}>the turn lock</a> and
    <a href={epubSectionHref('bugs')}>the bugs</a> further down are about them.
  </p>
</DocsSection>

<DocsSection title={EPUB_SECTIONS.columns}>
  <p>
    A browser can already cut a long text into equal pieces: CSS multi-column layout. Give the
    chapter's root element a fixed height and a <code>column-width</code> as wide as a page, set
    <code>column-fill: auto</code> so each column fills before the next one starts, and the text flows
    into as many columns as it needs, side by side, overflowing to the right. Each column is a page. To
    turn the page, a reader scrolls by one column width.
  </p>
  <DocsCode label={COLUMNIZE.label} code={COLUMNIZE.code} />
  <p>
    foliate-js sets those properties with <code>!important</code> on the chapter's root, then makes
    the iframe as wide as the whole row of columns: <code>View.expand</code> sets the frame's width
    to the page count times the page width, and its wrapper two pages wider, one blank page at each
    end. The paginator's container has <code>overflow: hidden</code> and is scrolled with
    <code>scrollLeft</code>, so one page shows at a time.
  </p>
  <Figure>
    <Diagram
      label={COLUMNS_DIAGRAM.label}
      width={COLUMNS_DIAGRAM.width}
      height={COLUMNS_DIAGRAM.height}
      nodes={COLUMNS_DIAGRAM.nodes}
      edges={COLUMNS_DIAGRAM.edges}
    />
    {#snippet caption()}
      A horizontal chapter. Inside the frame, <code>innerWidth</code> is the width of the whole row, which
      the live demo below measures.
    {/snippet}
  </Figure>
</DocsSection>

<DocsSection title={EPUB_SECTIONS.vertical}>
  <p>
    Japanese novels are usually set vertically: characters run from top to bottom, and each new line
    starts to the left of the last. CSS writes that as <code>writing-mode: vertical-rl</code>: the
    inline direction becomes vertical and the block direction runs right to left. Columns follow the
    inline direction, so in a vertical chapter they stack downward, and foliate-js pages it top to
    bottom: it fixes the chapter's width instead of its height and scrolls with
    <code>scrollTop</code>. foliate-js works this out for every chapter as it loads, from the
    computed style of the chapter's <code>body</code>:
  </p>
  <DocsCode label={GET_DIRECTION.label} code={GET_DIRECTION.code} />
  <p>
    Which way the pages turn is a separate fact, and the spine holds it. With
    <code>page-progression-direction="rtl"</code> the next page is on the left, as in a printed
    Japanese book that opens from the right. foliate-js keeps the spine's value as
    <code>book.dir</code>, and its left and right commands follow it, so in such a book the left
    arrow goes forward.
  </p>
  <DocsCode label={GO_LEFT_RIGHT.label} code={GO_LEFT_RIGHT.code} />
</DocsSection>

<DocsSection title={EPUB_SECTIONS.cfi}>
  <p>
    A page number is not a position in a reflowable book. Pick a larger font and page 12 holds
    different text. A bookmark has to name the text itself, and the
    <a href={CFI_SPEC}>EPUB Canonical Fragment Identifier</a> specification (CFI) defines how: a
    path from the package document, through the spine, into the chapter's DOM. The specification's
    own example is <code>epubcfi(/6/4[chap01ref]!/4[body01]/10[para05]/3:10)</code>.
  </p>
  <ul>
    <li>
      Each <code>/n</code> step picks a child. Even numbers are elements, so <code>/2</code> is the
      first child element and <code>/4</code> the second. Odd numbers are the runs of text before, between
      and after them.
    </li>
    <li>
      The first step starts at the package's root, so <code>/6</code> is its third child element,
      the spine, and <code>/4</code> is the spine's second <code>itemref</code>.
    </li>
    <li><code>!</code> steps into the document that itemref names.</li>
    <li>
      <code>:10</code> is a character offset, counted in UTF-16 code units, the same units as a
      JavaScript string's <code>length</code>.
    </li>
    <li>
      <code>[chap01ref]</code> is an id assertion: the element at that step should have that id, and if
      a later edition moved it, a reader can find it by the id and correct the path.
    </li>
    <li>
      A range is written as the common path and its two ends:
      <code>epubcfi(parent,start,end)</code>.
    </li>
  </ul>
  <p>
    A CFI follows the document, not the layout, so a change of font size, screen size or writing
    mode leaves it valid. An edit to the book can break it. For that the specification adds id
    assertions and text location assertions, which a reader can use to correct a path after a
    change.
  </p>
  <CfiReader />
</DocsSection>
