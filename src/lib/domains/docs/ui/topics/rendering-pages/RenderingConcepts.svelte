<script lang="ts">
  import Diagram from '$lib/components/Diagram.svelte';
  import Figure from '$lib/components/Figure.svelte';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import DecodeDemo from './DecodeDemo.svelte';
  import ObjectUrlDemo from './ObjectUrlDemo.svelte';
  import { FILE_TO_PIXELS, PREFETCH_WINDOW } from './rendering-diagrams';
  import {
    EPUB_ARCHIVE_HREF,
    PDF_SCALE_HREF,
    RENDERING_SECTIONS,
    STORAGE_BOOKS_HREF,
  } from './rendering-sections';
  import { DECODE_IMAGE, PDF_OPEN } from './rendering-snippets';

  type Props = { pageUrl: string };

  let { pageUrl }: Props = $props();
</script>

<DocsSection title={RENDERING_SECTIONS.pipeline}>
  <p>
    On a web page, <code>&lt;img src="page.jpg"&gt;</code> is all it takes to show a picture: the browser
    fetches the file, decodes it and paints it. A comic book does not arrive that way. It arrives as one
    file, a CBZ (a ZIP of images), a PDF, or a folder of images, often a few hundred megabytes, and the
    pages are inside it. To show page 140, something has to find page 140's bytes inside the file, turn
    them into pixels, and put those pixels on screen, while the other few hundred pages stay where they
    are.
  </p>
  <p>
    The two kinds of file take different roads. A ZIP holds each page as an encoded image, a JPEG or
    PNG, so one page is a run of bytes that a browser can already display. A PDF page is not a
    picture at all: it is a list of drawing instructions, and something has to paint them at some
    size before there are any pixels. Both roads end at the same place.
  </p>
  <Figure>
    <Diagram {...FILE_TO_PIXELS} />
    {#snippet caption()}
      Two roads from a book file to the screen. The ZIP road never decodes in JavaScript; the PDF
      road has to paint.
    {/snippet}
  </Figure>
  <p>
    Every step on both roads costs memory or time. The sections below take the steps one at a time,
    then show how Dokseo runs them.
  </p>
</DocsSection>

<DocsSection title={RENDERING_SECTIONS.decode}>
  <p>
    A JPEG is compressed. A 2000 by 3000 pixel scan might be 1 MB on disk. To paint it, the browser
    decodes it into a bitmap: one value for red, green, blue and alpha per pixel, a byte each. That
    is width times height times 4 bytes, so the same scan becomes 24 MB in memory, whatever its file
    size was. Decoding also takes time, and more pixels take longer.
  </p>
  <p>
    <code>createImageBitmap(blob)</code> is the script's way to request that decode. It returns a
    promise of an <code>ImageBitmap</code>, a decoded image ready to draw. The bitmap holds its
    pixels until
    <code>bitmap.close()</code>
    releases them, after which its <code>width</code> and <code>height</code> read 0. Without a
    <code>close()</code> the pixels stay until the garbage collector reclaims the object, at a time no
    script controls. Dokseo decodes a page image through this function:
  </p>
  <DocsCode label={DECODE_IMAGE.label} code={DECODE_IMAGE.code} />
  <p>
    <code>imageOrientation: 'from-image'</code> applies the EXIF orientation a camera writes, so a photo
    taken sideways decodes upright. Try the decode on three images below. The scan and the slice are generated
    on the spot, so their file sizes are whatever this browser's JPEG encoder produces, but their decoded
    size is fixed by their dimensions.
  </p>
  <DecodeDemo {pageUrl} />
</DocsSection>

<DocsSection title={RENDERING_SECTIONS.surfaces}>
  <p>
    A page can reach the screen through an <code>&lt;img&gt;</code> element or a
    <code>&lt;canvas&gt;</code>. They look the same and behave very differently in memory.
  </p>
  <Table size="sm">
    <TableHeader>
      <TableRow>
        <TableHeaderCell></TableHeaderCell>
        <TableHeaderCell><code>&lt;img&gt;</code></TableHeaderCell>
        <TableHeaderCell><code>&lt;canvas&gt;</code></TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell>Holds</TableCell>
        <TableCell>A URL to encoded bytes</TableCell>
        <TableCell>A bitmap of its own, width times height times 4 bytes</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Decoded pixels</TableCell>
        <TableCell
          >Belong to the browser's image cache, which can discard them and decode again</TableCell
        >
        <TableCell>Belong to the page until the canvas is gone</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Natural size</TableCell>
        <TableCell><code>naturalWidth</code>, <code>naturalHeight</code></TableCell>
        <TableCell><code>width</code>, <code>height</code></TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Load events</TableCell>
        <TableCell><code>load</code> and <code>error</code>, free</TableCell>
        <TableCell>None, since the page's own script does the drawing</TableCell>
      </TableRow>
    </TableBody>
  </Table>
  <p>
    The discard is real. WebKit's memory cache prunes the decoded data of images still on the page
    when it shrinks, and decodes again when the image is painted next. A canvas has no such escape:
    its bitmap is the only copy. So a page that already is an image belongs in an
    <code>&lt;img&gt;</code>, and a canvas is for pixels that only exist because a script painted
    them, which is what a PDF page is.
  </p>
  <p>
    <code>decoding="async"</code> on an <code>&lt;img&gt;</code> allows the browser to decode it
    without holding up the paint of everything else, which matters for a large page that appears
    during a scroll. <code>loading="lazy"</code> sounds like a partner to it and is not: it delays the
    fetch until the element nears the viewport, which helps a long article and gets in the way of a reader
    that already chooses which pages to mount.
  </p>
  <p>
    One thing never goes on a canvas: text. When Dokseo recognizes the words in a speech bubble, it
    shows them as ordinary text in the page's DOM, so they can be selected, copied, searched and
    read by a dictionary extension. Pixels of letters on a canvas are none of those things. The page
    image is a picture; the recognized text is text.
  </p>
</DocsSection>

<DocsSection title={RENDERING_SECTIONS.objectUrls}>
  <p>
    An <code>&lt;img&gt;</code> needs a URL, and a page read out of a ZIP is a <code>Blob</code> in
    memory with no URL. <code>URL.createObjectURL(blob)</code> mints one, a string like
    <code>blob:http://localhost:5173/6f1c…</code>. The File API keeps a table, the blob URL store,
    mapping each such string to its blob. While the entry exists, the blob cannot be garbage
    collected, even if no variable refers to it anymore: the store does.
  </p>
  <p>
    The entry goes away in two ways only: <code>URL.revokeObjectURL(url)</code>, or the document
    unloading. A comic reader is one document that stays open for an hour while hundreds of pages
    pass through it. Without revokes, it goes like this:
  </p>
  <ol>
    <li>
      Turn to a page. Its entry is read out of the ZIP as a blob of a few hundred kilobytes, and a
      URL is minted for it.
    </li>
    <li>
      Turn again. A new blob and a new URL. The previous page's element is gone, but its entry in
      the store keeps its blob alive.
    </li>
    <li>Read for an hour. Every page ever shown is still in memory, and nothing reports it.</li>
  </ol>
  <p>
    Revoking fixes it, with one condition the spec spells out: a request that started before the
    revoke still succeeds, and anything that resolves the URL afresh afterwards fails as if the
    network had failed. An image already on screen keeps its pixels. A second element given the same
    URL gets an error. So a URL may be revoked only by whoever is the last to use it.
  </p>
  <ObjectUrlDemo {pageUrl} />
</DocsSection>

<DocsSection title={RENDERING_SECTIONS.scale}>
  <p>
    CSS measures in CSS pixels. A screen has device pixels, and
    <code>window.devicePixelRatio</code> is how many device pixels one CSS pixel spans across: 1 on many
    desktop monitors, 2 or 3 on phones and high-density laptop screens, and a fraction such as 1.25 or
    1.5 on a scaled desktop. An image 360 pixels wide shown 360 CSS pixels wide at a ratio of 3 is stretched
    three times, and looks soft. To look sharp it needs three times the pixels across.
  </p>
  <p>
    For a JPEG page there is nothing to choose: it has the pixels it was scanned with, and CSS
    scales it to the box. For a PDF page there is. Its drawing instructions are in points, 1/72 of
    an inch, and pdf.js paints them at a scale: at scale 1 a point is one pixel, so a US Letter page
    of 612 by 792 points becomes 612 by 792 pixels, and at scale 2 it becomes 1224 by 1584. A higher
    scale is sharper and costs memory with the square of the scale: twice the scale is four times
    the bytes.
  </p>
  <p>
    The scale also sets what a pixel coordinate means. A rectangle measured in pixels of a scale 2
    render covers twice the numbers of the same rectangle at scale 1. Anything stored as page pixels
    is tied to the scale it was measured at, which is why Dokseo stores a capture's rectangle as
    fractions of the page instead. The demo for that is further down, in
    <a href={PDF_SCALE_HREF}>{RENDERING_SECTIONS.pdfScale}</a>.
  </p>
</DocsSection>

<DocsSection title={RENDERING_SECTIONS.offscreen}>
  <p>
    <code>OffscreenCanvas</code> is a canvas with no element: <code>new OffscreenCanvas(w, h)</code>
    gives a drawing surface that is not in the DOM. It works on the main thread and inside a worker. It
    has two ways out. <code>transferToImageBitmap()</code> returns its pixels as an
    <code>ImageBitmap</code> at once, without a copy, and leaves the canvas blank.
    <code>convertToBlob({'{'} type, quality {'}'})</code> encodes them as a PNG, JPEG or WebP file.
  </p>
  <p>
    An <code>ImageBitmap</code> is transferable: <code>postMessage(message, [bitmap])</code> moves
    it to or from a worker without copying, and the sender's bitmap reads 0 by 0 afterwards. On the
    display side, a canvas with a <code>bitmaprenderer</code> context takes a bitmap with
    <code>transferFromImageBitmap(bitmap)</code>, again by moving it, so the canvas shows the pixels
    with no drawing call and the bitmap is spent.
  </p>
  <p>
    A worker keeps heavy work off the thread that handles scrolling and taps. pdf.js uses one for
    the slowest part of a PDF, parsing the file and turning a page into a list of drawing
    operations. The painting of those operations happens on the thread that calls <code>render</code
    >, which in Dokseo is the main thread, into an <code>OffscreenCanvas</code>.
  </p>
</DocsSection>

<DocsSection title={RENDERING_SECTIONS.zip}>
  <p>
    A ZIP puts its table of contents at the end of the file: the central directory, one record per
    entry with its name, sizes, compression method and the offset where its data starts. A reader
    can find the directory by reading the last few kilobytes, then reach any entry directly by its
    offset. zip.js does exactly that: <code>new ZipReader(new BlobReader(blob))</code> and
    <code>getEntries()</code>
    read only the directory (zip.js scans at most the last 65,557 bytes for its end record), and
    <code>entry.getData(writer)</code> reads and decompresses that one entry. Page 140 of a 400 MB CBZ
    costs the same as page 1.
  </p>
  <p>
    That only works because of how a browser holds a file. A <code>Blob</code> or <code>File</code>
    is a reference with a size, not a buffer. <code>blob.slice(from, to)</code> is another reference
    and reads nothing. Bytes are read only when a call requests them, with
    <code>arrayBuffer()</code>, <code>text()</code> or a stream. A <code>File</code> from the origin
    private file system is backed by the file on disk, so a slice of it reads that range from disk.
    One <code>await blob.arrayBuffer()</code> on a whole book undoes all of it. The
    <a href={STORAGE_BOOKS_HREF}>storage page</a> shows how the file gets into that file system, and
    the <a href={EPUB_ARCHIVE_HREF}>EPUB page</a> opens a ZIP byte by byte.
  </p>
  <p>
    Images in a CBZ are almost always stored rather than deflated, since a JPEG does not compress
    further. A stored entry's bytes sit in the archive as they are, so a slice of the archive at the
    right offset is the image file itself.
  </p>
</DocsSection>

<DocsSection title={RENDERING_SECTIONS.pdf}>
  <p>
    pdf.js is Mozilla's PDF renderer, the one inside Firefox. Using it takes three steps:
    <code>getDocument(source)</code> opens a document and returns a loading task whose promise
    resolves to the document, <code>pdf.getPage(n)</code> fetches page <em>n</em> counting from 1,
    and <code>page.render({'{'} canvasContext, viewport {'}'})</code> paints it. The viewport comes
    from
    <code>page.getViewport({'{'} scale {'}'})</code>, and its <code>width</code> and
    <code>height</code> are the page size in points times the scale.
  </p>
  <p>
    The parsing runs in a worker whose script URL is set in
    <code>GlobalWorkerOptions.workerSrc</code>. Like a ZIP, a PDF keeps a table at its end, the
    cross-reference table, so pdf.js does not need the whole file to start. Given a
    <code>PDFDataRangeTransport</code> instead of the bytes, it requests ranges as it needs them, in
    chunks of 64 KB by default, and with <code>disableAutoFetch</code> it does not prefetch the rest of
    the file in the background. Dokseo opens a PDF like this:
  </p>
  <DocsCode label={PDF_OPEN.label} code={PDF_OPEN.code} />
  <p>
    The chunks pdf.js fetched stay in its worker, in one array the length of the file, until the
    document is destroyed. So memory grows with how much of the file has been visited, and is
    released all at once by <code>task.destroy()</code>, which ends the worker.
  </p>
  <p>
    pdf.js ships two builds. The modern build in <code>pdfjs-dist/build/</code> calls new JavaScript
    APIs without checking for them. The legacy build in <code>pdfjs-dist/legacy/build/</code> is the same
    code with polyfills for those APIs, and is larger. The library and its worker must come from the same
    build.
  </p>
</DocsSection>

<DocsSection title={RENDERING_SECTIONS.ios}>
  <p>
    Safari, and every other iOS browser built on WebKit, puts a cap on the area of a canvas. In
    WebKit's source (<code>maxCanvasArea</code> in <code>CanvasBase.cpp</code>) the cap on iOS is
    8192 × 8192, 67,108,864 pixels, and 16384 × 16384 on other platforms. In the branches through
    Safari 17 the iOS cap was 4096 × 4096, 16,777,216 pixels; the larger cap is in the branches from
    Safari 18 on. The cap is on width times height, not on either side alone.
  </p>
  <p>
    A canvas over the cap does not throw. WebKit logs one console warning, "Canvas area exceeds the
    maximum limit", and creates no backing buffer, so every drawing call on it does nothing and the
    canvas stays blank. A 1000 by 20,000 webtoon slice is 20 million pixels: fine as an
    <code>&lt;img&gt;</code>, and over the Safari 17 cap as a canvas. The decode demo above marks
    which cap each image passes.
  </p>
  <p>
    The branch WebKit cut before Safari 17 also capped the total memory of all canvases on iOS at a
    quarter of the device's RAM, and refused a new canvas past it with "Total canvas memory use
    exceeds the maximum limit". That check is not in the branches from Safari 17 on. Beyond the
    canvas caps, iOS ends a web content process that uses too much memory, and the tab reloads.
    Apple does not publish that limit.
  </p>
</DocsSection>

<DocsSection title={RENDERING_SECTIONS.window}>
  <p>
    Decoding takes time, so a page decoded only when it appears arrives late: a blank frame on every
    turn, or a scroll that runs into empty space. Decoding every page up front fills memory. The
    answer between the two is a window: keep the pages near the one on screen loaded, load ahead in
    the direction of travel first, and release everything outside the window.
  </p>
  <p>
    For a paged reader the window can be small, because a turn moves one step. For a scrolled strip
    it has to cover how far a fling travels while the next image loads, and it needs a cap, because
    on a short screen a few screens can hold many images.
  </p>
  <Figure>
    <Diagram {...PREFETCH_WINDOW} />
    {#snippet caption()}
      Dokseo's two windows. Whatever leaves a window is unmounted, and unmounting releases its
      picture.
    {/snippet}
  </Figure>
</DocsSection>
