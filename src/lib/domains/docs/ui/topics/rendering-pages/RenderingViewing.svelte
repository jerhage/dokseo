<script lang="ts">
  import StepItem from '$lib/ui/components/StepItem.svelte';
  import StepList from '$lib/ui/components/StepList.svelte';
  import { ASSUMED_ASPECT } from '$lib/domains/viewing/domain/strip';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import PairingDemo from './PairingDemo.svelte';
  import { RENDERING_SECTIONS } from './rendering-sections';
  import {
    CHOSEN_FILES,
    DEVICE_PIXEL_SNAP,
    EFFECTIVE_PAIRING,
    PAIR_PAGES,
    STRIP_REACH,
  } from './rendering-snippets';
</script>

<DocsSection title={RENDERING_SECTIONS.pairing}>
  <p>
    A printed manga is read as two facing pages. On a wide screen Dokseo can show the same: each
    group of one or two images is shown together, and a turn moves one group. Which images pair up
    depends on their proportions. An image wider than it is tall is usually a two-page spread
    scanned as one picture, and it takes the whole group by itself. A book can choose one page at a
    time, two pages side by side, two pages with the cover alone, or automatic:
  </p>
  <DocsCode label={EFFECTIVE_PAIRING.label} code={EFFECTIVE_PAIRING.code} />
  <DocsCode label={PAIR_PAGES.label} code={PAIR_PAGES.code} />
  <p>
    Narrow means the reading area is narrower than <code>--breakpoint-compact</code>, a CSS length
    the frame measures with a hidden element so the number lives in one place. The cover stands
    alone in a printed book, so the pages after it face each other in pairs that start at the second
    image; pairing from the first image would put every facing pair across two groups. A strip is
    always single, and always left to right, since a reading direction means nothing for images
    stacked top to bottom. In a right-to-left book the two images of a group are laid out in
    reverse, so the earlier page is on the right.
  </p>
  <PairingDemo />
  <p>
    The grouping needs the sizes, and before they arrive every image is assumed portrait. Since the
    sizes come from the image headers when the book opens, the assumption lasts only until that read
    finishes, and the reading position is an image index, so it survives the regroup.
  </p>
</DocsSection>

<DocsSection title={RENDERING_SECTIONS.viewport}>
  <p>
    In the paged viewer a page frame is sized by CSS to the height of the reading area, with an
    <code>aspect-ratio</code> from the image's natural size, and a group sits in a row. Zoom and pan
    are a CSS <code>transform</code> on that row, set through three custom properties, so zooming in
    paints the same picture larger and decodes nothing. Zoom 1 is the page fitted to the height. A
    book set to fit the width arrives at the zoom where the group fills the width instead, centered;
    <code>arrivalViewport</code> in <code>viewing/domain/viewport.ts</code> works out the zoom and pan
    for each arrival.
  </p>
  <p>
    Zoomed in, a horizontal drag pans the page until the pan reaches its edge. The rest of the drag
    is overscroll: <code>travelPastEdge</code> in <code>overscroll.ts</code> takes the drag, clamps the
    pan, and returns the part of the travel the clamp removed. That remainder is what moves the next group
    in, and once the finger lifts, its length and speed go through the same swipe test as any other swipe
    to turn the page or not. So the same gesture pans a zoomed page and turns it at its edge.
  </p>
</DocsSection>

<DocsSection title={RENDERING_SECTIONS.strip}>
  <p>
    The continuous viewer stacks every image at the width of the strip, so each image's height is
    the width times its height-to-width ratio, or {ASSUMED_ASPECT} times the width for an image whose
    size is not known yet. <code>layOutStrip</code> computes every slice's top and height; the strip renders
    only a window of them as real elements, and two spacer elements above and below take up the height
    of the rest, so the scrollbar is right for the whole book.
  </p>
  <p>
    The window comes from <code>stripWindow</code>. It keeps every slice on screen, then fills up to
    a cap, nearest first, in the direction of travel before the other:
  </p>
  <DocsCode label={STRIP_REACH.label} code={STRIP_REACH.code} />
  <p>
    I sized it by measuring. A probe flung a 40-slice book in Chromium with the CPU slowed down to
    stand in for a phone, and recorded each slice that came on screen before its image had loaded.
    With half a screen of margin each way, at a tenfold slowdown, 32 of 42 slices arrived blank in
    one run. With three screens ahead, 3 of 32 did. One screen behind covers a change of direction
    until the next scroll event reports it. The cap of eight bounds the memory for a PDF strip,
    where every slice is a bitmap the page owns: a US Letter page at scale 2 is 1224 by 1584 pixels,
    about 7.8 MB, so a full window is about 62 MB. For an archive strip the slices are <code
      >&lt;img&gt;</code
    > elements, so the cap bounds object URLs and entry reads rather than pixels.
  </p>
  <p>
    The strip has one more concern a paged book does not: the artwork continues across the cut
    between two slices. Each slice's height in CSS pixels is usually fractional, and when the
    browser rounds each edge to the device pixel grid on its own, two slices can leave a
    one-device-pixel gap that looks like a scratch in the scan, repeated at every cut. The strip
    rounds every slice's top to the device pixel grid and takes each height as the difference
    between two rounded tops, so one slice's bottom is the next slice's top:
  </p>
  <DocsCode label={DEVICE_PIXEL_SNAP.label} code={DEVICE_PIXEL_SNAP.code} />
</DocsSection>

<DocsSection title={RENDERING_SECTIONS.lessons}>
  <p>
    Each of these fails without an exception, a console error or a failing request. The page just
    does something other than what it should.
  </p>
  <StepList>
    <StepItem title="A file chosen, and then nothing">
      <p>
        Choose a book in the file picker. The handler keeps <code>input.files</code>, then clears
        <code>input.value</code> so the same file can be chosen again. The list it kept is live, so clearing
        the input emptied it, and the upload received no files. The fix is to copy the files out first:
      </p>
      <DocsCode label={CHOSEN_FILES.label} code={CHOSEN_FILES.code} />
    </StepItem>
    <StepItem title="A selection that captured nothing">
      <p>
        Pages used to be canvases declared at width and height 0, filled with
        <code>transferFromImageBitmap</code>. Drag a box over a speech bubble: nothing is captured.
        The canvas showed the page at full resolution, but its <code>width</code> still read 0,
        because a transfer changes what the canvas paints, not its size attributes. The mapping from
        the screen to the page refuses a page whose size is not positive, so every region was
        dropped. The fix is the two assignments before the transfer in <code>PageFrame</code>. When
        pages moved to
        <code>&lt;img&gt;</code>, the size reading had to move with them: an image's page size is
        <code>naturalWidth</code>, and its <code>width</code> is the size it is displayed at.
      </p>
    </StepItem>
    <StepItem title="Forty pages read to show six">
      <p>
        Open a 40-image strip. On the first render the scroller has not been measured, so it is 0 by
        0, every slice lays out at height 0 at the top, and every slice is inside a viewport of
        height 0. The window mounted the whole book for one frame, and each frame read its entry and
        minted a URL before it was unmounted: 40 entry reads at open. Counting elements showed 6;
        counting
        <code>URL.createObjectURL</code> calls showed 40. A window over a frame with no height is now
        empty.
      </p>
    </StepItem>
    <StepItem title="Memory that only grows">
      <p>
        Mint an object URL for each page and never revoke it, then read through a book. Every page
        shown stays in memory until the tab closes. The fix is the ownership above: a fresh URL per
        frame, revoked by that frame. Sharing one URL between two elements and revoking it from one
        leaves the other blank.
      </p>
    </StepItem>
  </StepList>
</DocsSection>

<DocsSection title={RENDERING_SECTIONS.rule}>
  <p>
    Keep the book as a handle, a <code>Blob</code> over a file on disk, and read one page out of it
    when the page is needed. Let the browser own the pixels of anything that already is an image, by
    showing it in an <code>&lt;img&gt;</code>. Paint into a canvas only what has to be painted, at a
    scale that never changes once something is stored against it. Give every URL and every bitmap
    one owner, and release it when the page leaves the window.
  </p>
</DocsSection>
