<script lang="ts">
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import RenderScaleDemo from './RenderScaleDemo.svelte';
  import {
    EPUB_LAYOUTS_HREF,
    OCR_CAPTURE_HREF,
    OCR_CROP_HREF,
    RENDERING_SECTIONS,
  } from './rendering-sections';
  import {
    ARCHIVE_PICTURE,
    COVER_THUMBNAIL,
    FRAME_DRAW,
    FRAME_LOAD,
    PACK_FOLDER,
    PAGE_SOURCE_INTERFACE,
    PAGE_SOURCE_PORT,
    PDF_BUILD_CHOICE,
    PDF_RENDER,
    PDF_RUNTIME,
    RELEASE_PICTURE,
  } from './rendering-snippets';
</script>

<DocsSection title={RENDERING_SECTIONS.port}>
  <p>
    Dokseo reads manga, which is turned page by page, and webtoons, which are one long strip
    scrolled from top to bottom. A book record holds its <code>layoutKind</code>, <code>paged</code>
    or
    <code>continuous</code>, and the reading screen picks a viewer from it. Both viewers read the
    same thing: a <code>PageSource</code>, one numbered sequence of images. A strip is still a
    sequence of images, stacked instead of turned, so nothing below the viewer depends on which
    layout it serves.
  </p>
  <DocsCode label={PAGE_SOURCE_INTERFACE.label} code={PAGE_SOURCE_INTERFACE.code} />
  <p>
    The port lives in <code>src/lib/shared/page-source.ts</code>. An image is addressed by an
    <code>ImageIndex</code> from 0, never by a page number, because the label a person sees ("page
    12", or "012" in the strip) is derived for display. <code>picture(index)</code> is for the
    screen. <code>image(index)</code> returns a decoded <code>ImageBitmap</code>, for the two jobs
    that need real pixels: cropping a selection for OCR, and drawing a cover.
    <code>sizes()</code> returns every image's size at once, so the layout can be computed before any
    image is shown. A picture comes in one of two kinds:
  </p>
  <DocsCode label={PAGE_SOURCE_PORT.label} code={PAGE_SOURCE_PORT.code} />
  <p>
    That union is the <code>&lt;img&gt;</code> or canvas choice from earlier, written into the type.
    An <code>encoded</code> picture is a URL for an <code>&lt;img&gt;</code>; a <code>drawn</code>
    one is a bitmap for a canvas. <code>PageFrame.svelte</code> in the viewing domain renders one or the
    other, so each viewer mounts one frame per image and never looks inside.
  </p>
</DocsSection>

<DocsSection title={RENDERING_SECTIONS.sources}>
  <p>
    The adapters live in <code>src/lib/domains/library/adapters/</code>, and each loads through a
    dynamic <code>import()</code>, so the code for a format arrives only when a book of that format
    opens.
  </p>
  <Table size="sm">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Book</TableHeaderCell>
        <TableHeaderCell>Adapter</TableHeaderCell>
        <TableHeaderCell><code>picture()</code></TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell>ZIP or CBZ</TableCell>
        <TableCell><code>archive-page-source.ts</code></TableCell>
        <TableCell><code>encoded</code>: the entry's bytes behind a new object URL</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Folder of images</TableCell>
        <TableCell><code>archive-page-source.ts</code>, after packing</TableCell>
        <TableCell><code>encoded</code>, the same way</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>PDF</TableCell>
        <TableCell><code>pdf-page-source.ts</code></TableCell>
        <TableCell><code>drawn</code>: the page painted at scale 2</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>EPUB of one image per page</TableCell>
        <TableCell><code>epub-page-source.ts</code></TableCell>
        <TableCell><code>encoded</code>, like an archive</TableCell>
      </TableRow>
    </TableBody>
  </Table>
  <p>The archive adapter is the common case, and its display path decodes nothing in JavaScript:</p>
  <DocsCode label={ARCHIVE_PICTURE.label} code={ARCHIVE_PICTURE.code} />
  <p>
    A folder of images has no single file to keep, so when it is added
    <code>archive-packer.ts</code> packs it into a ZIP with compression level 0. The ZIP is a
    container, not a compressor: each image is copied in once, streamed from its own
    <code>File</code>, and the book is then an archive like any other.
  </p>
  <DocsCode label={PACK_FOLDER.label} code={PACK_FOLDER.code} />
  <p>
    An EPUB becomes a page source only when every document in its reading order is a single image
    with no text beside it, the form of a fixed-layout comic. Any other EPUB is a book of text and
    goes to the EPUB reader instead; the <a href={EPUB_LAYOUTS_HREF}>EPUB page</a> covers layouts.
  </p>
  <p>
    Before a page is shown, <code>sizes()</code> reads every image's width and height from its
    header, the first bytes of the file, without decoding it. For a stored archive entry that is a
    slice of the archive starting at the entry's data: 16 KB first, read again four times larger
    while the header is incomplete, up to 256 KB. For a PDF it is <code>getViewport</code> at the render
    scale, with no render.
  </p>
</DocsSection>

<DocsSection title={RENDERING_SECTIONS.pageList}>
  <p>
    Inside a ZIP, Dokseo takes as pages the entries whose extension is an image type, that are not
    hidden files, not inside a <code>__MACOSX</code> folder and not a <code>Thumbs.db</code> or
    <code>desktop.ini</code>, sorted in natural order so <code>page2</code> comes before
    <code>page10</code>. That rule changed once already, to skip more junk files, and every change
    to it moves the index of every image after a file it now skips.
  </p>
  <p>
    An index is what a capture and a reading place store. So when a book is added, Dokseo stores the
    exact list of entry names it chose, in order, in a separate IndexedDB store,
    <code>page-lists</code>, keyed by the book. Opening the book opens the archive by that list and
    never runs the rule again. If a listed name is missing from the archive, the open fails with
    "The archive holds no page named …" rather than showing a book whose pages moved. A PDF or EPUB
    has an order of its own and stores no list.
  </p>
</DocsSection>

<DocsSection title={RENDERING_SECTIONS.ownership}>
  <p>
    A picture holds something that needs releasing: an object URL to revoke or a bitmap to close.
    Dokseo gives each picture one owner at a time and one function to release it, in
    <code>src/lib/platform/image/bitmap.ts</code>:
  </p>
  <DocsCode label={RELEASE_PICTURE.label} code={RELEASE_PICTURE.code} />
  <p>
    Every call to <code>picture()</code> returns a fresh URL, so no two elements share one, and the
    frame that requested it owns it. <code>PageFrame</code> loads its picture in an attachment whose cleanup
    runs when the frame unmounts or its index changes. A picture that arrives after the frame is already
    gone is released on arrival; a picture that was shown is released in the cleanup:
  </p>
  <DocsCode label={FRAME_LOAD.label} code={FRAME_LOAD.code} />
  <p>
    <code>ReaderView.pictureAt</code> does the same one level up. It notes a generation counter
    before it calls the source, and if another book opened while the picture was on its way, the
    counter has moved, so it releases the late picture and returns <code>null</code>.
  </p>
  <p>
    A <code>drawn</code> picture goes into a <code>bitmaprenderer</code> canvas by transfer, so no pixel
    is copied:
  </p>
  <DocsCode label={FRAME_DRAW.label} code={FRAME_DRAW.code} />
  <p>
    The two size assignments before the transfer are not decoration, as the last section explains.
    The OCR side has a wrapper for bitmaps that pass through several steps, <code>OwnedBitmap</code
    >, whose dispose closes the bitmap unless <code>release()</code> passed it on; the
    <a href={OCR_CROP_HREF}>OCR page</a> follows a crop through it.
  </p>
</DocsSection>

<DocsSection title={RENDERING_SECTIONS.pdfScale}>
  <p>
    <code>pdf-page-source.ts</code> renders every page at one constant,
    <code>RENDER_SCALE = 2</code>, into an <code>OffscreenCanvas</code> the size of the viewport,
    and takes the pixels out with
    <code>transferToImageBitmap()</code>:
  </p>
  <DocsCode label={PDF_RENDER.label} code={PDF_RENDER.code} />
  <p>
    The <code>as unknown as</code> cast is pdf.js's own type gap: its render parameters name an on-screen
    2D context, and the adapter passes an offscreen one, which pdf.js draws into just the same. It stays
    inside the adapter.
  </p>
  <p>
    <code>picture()</code> and <code>image()</code> are the same render, so the page shown and the
    page cropped for OCR are the same pixels. That matters for captures. A capture stores an image
    index and a rectangle in that image's pixels, as the <a href={OCR_CAPTURE_HREF}>OCR page</a>
    shows. For a PDF those are pixels of the scale 2 render. Change the scale, or make it follow the screen,
    and every rectangle already stored lands in the wrong place, with nothing failing. A test in
    <code>pdf-page-source.spec.ts</code> renders a portrait page and a landscape spread and checks that
    picture and image come out at the same size; one geometry would not catch a scale derived from the
    screen width, since such a scale agrees with a constant on exactly one aspect ratio.
  </p>
  <RenderScaleDemo />
  <p>
    Scale 2 is the same on every screen. A page of A4, 595 by 842 points, renders to 1190 by 1684
    pixels, about 8 MB of bitmap. Shown across a phone 390 CSS pixels wide at a ratio of 3, the
    screen has 1170 device pixels across, about one per page pixel. Fit to a window 800 pixels tall
    at a ratio of 1, the same render has about twice the pixels the screen can show.
  </p>
</DocsSection>

<DocsSection title={RENDERING_SECTIONS.pdfLoading}>
  <p>
    pdf.js is the heaviest dependency on the reading side, and most books never need it, so it loads
    the first time a PDF opens and then stays loaded for the page's lifetime. The adapter checks
    which build this browser can run, imports that build's library, and points the worker at the
    same build:
  </p>
  <DocsCode label={PDF_RUNTIME.label} code={PDF_RUNTIME.code} />
  <DocsCode label={PDF_BUILD_CHOICE.label} code={PDF_BUILD_CHOICE.code} />
  <p>
    <code>MODERN_BUILD_REQUIREMENTS</code> in <code>pdf-build.ts</code> lists the thirty APIs the modern
    build calls, taken from the polyfill headers of the legacy build. The list exists because of a real
    failure on iOS:
  </p>
  <ol>
    <li>Add a PDF on an iPhone. It is larger than 64 KB, as every real book is.</li>
    <li>pdf.js opens it from the first 64 KB and requests its first range.</li>
    <li>
      The modern worker calls <code>Map.prototype.getOrInsertComputed</code>, which that Safari did
      not have, and the upload fails with
      <code>this._requestsByChunk.<wbr />getOrInsertComputed is not a function</code>.
    </li>
  </ol>
  <p>
    Feature detection picks the build, not the user agent string, so a Safari that gains the APIs
    gets the smaller modern build without a change. Each build is a separate chunk, so a browser
    fetches only the build it runs.
  </p>
  <p>
    That only holds if nothing else imports pdf.js. A static import anywhere, even a type-only one
    in the wrong file, would bundle a build in advance. A dependency-cruiser rule,
    <code>only-the-pdf-adapter-loads-pdfjs</code>, refuses any import of <code>pdfjs-dist</code>
    outside
    <code>pdf-page-source.ts</code>. The worker is named with
    <code>new URL(…, import.meta.url)</code>, which dependency-cruiser does not follow, so
    <code>pdf-build-entries.spec.ts</code> reads every source file as text and fails if any file but the
    adapter names a pdf.js entry that way, and checks that the adapter loads exactly a modern and a legacy
    library, each paired with the worker of its own build. Because it reads text, it would also fail on
    a quotation of that line, which is why the line is described here and not quoted.
  </p>
</DocsSection>

<DocsSection title={RENDERING_SECTIONS.covers}>
  <p>
    The library shows a cover for every book, and decoding a first page of 2000 by 3000 pixels for
    each card on every visit would cost 24 MB per card. So the cover is made once, when the book is
    added: the first image is decoded, drawn onto an <code>OffscreenCanvas</code> at most 400 pixels
    wide, encoded with <code>convertToBlob</code> as WebP at quality 0.8, and stored beside the book.
  </p>
  <DocsCode label={COVER_THUMBNAIL.label} code={COVER_THUMBNAIL.code} />
  <p>
    The full-size bitmap is closed in a <code>finally</code>, so it is released whether the
    thumbnail is made or fails. In the library, <code>CoverUrls</code> mints one object URL per cover
    blob, keeps it while that blob is still shown, and revokes the ones that left the grid.
  </p>
</DocsSection>
