<script lang="ts">
  import Diagram from '$lib/components/Diagram.svelte';
  import Figure from '$lib/components/Figure.svelte';
  import StepItem from '$lib/components/StepItem.svelte';
  import StepList from '$lib/components/StepList.svelte';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import {
    DOUBLE_TAP_MS,
    DOUBLE_TAP_SLOP_PX,
    LONG_PRESS_MS,
    TOUCH_SLOP_PX,
  } from '$lib/components/gesture';
  import { CLICK_SLOP_PX } from '$lib/shared/click-slop';
  import { SWIPE_AXIS_RATIO, SWIPE_MIN_PX, SWIPE_MIN_PX_PER_MS } from '$lib/shared/page-turn';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import GesturePadDemo from './GesturePadDemo.svelte';
  import PointerMediaDemo from './PointerMediaDemo.svelte';
  import { TOUCH_SECTIONS, touchHref } from './sections';
  import { DEVICE_SETTINGS, GESTURE_TREE } from './touch-diagrams';

  const CAPTURE_EXAMPLE = `pad.addEventListener('pointerdown', (event) => {
  pad.setPointerCapture(event.pointerId);
  start = { x: event.clientX, y: event.clientY, t: event.timeStamp };
});
pad.addEventListener('pointerup', (event) => {
  const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
  console.log(event.pointerType, moved, event.timeStamp - start.t);
});`;
</script>

<DocsSection title={TOUCH_SECTIONS.click}>
  <p>
    A <code>click</code> event fires once a button goes down and comes back up on the same element. It
    reports where the release happened and nothing about the path between. That is enough for a button.
    A reader page needs more: a swipe and a tap both end in a release, and a page has to turn on one and
    show the menu on the other.
  </p>
  <p>On a touch screen, a click is also late and incomplete. Take a finger on a phone:</p>
  <ol>
    <li>The finger lands on the page and slides 80 px to the left.</li>
    <li>The browser treats the slide as a scroll, if the page can scroll that way.</li>
    <li>No <code>click</code> fires, because the browser used the touch for scrolling.</li>
  </ol>
  <p>
    So a handler that listens only for <code>click</code> never runs for the swipe, and for a tap it gets
    where the finger lifted but not how long it stayed down or how far it drifted. A tap is a touch that
    ends close to where it began, soon after it began. A click is the event a browser fires afterwards,
    for compatibility with pages written for a mouse.
  </p>
</DocsSection>

<DocsSection title={TOUCH_SECTIONS.events}>
  <p>
    Pointer events give one model for every kind of input. A mouse, a pen and each finger on a touch
    screen is a pointer, and every pointer produces the same events:
  </p>
  <Table size="sm" caption="The four events a gesture is built from">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Event</TableHeaderCell>
        <TableHeaderCell>When it fires</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableHeaderCell scope="row"><code>pointerdown</code></TableHeaderCell>
        <TableCell>A finger or pen touches the surface, or a mouse button goes down.</TableCell>
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row"><code>pointermove</code></TableHeaderCell>
        <TableCell>The pointer changes position. A mouse fires it while hovering, too.</TableCell>
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row"><code>pointerup</code></TableHeaderCell>
        <TableCell>The finger or pen lifts, or the last mouse button comes up.</TableCell>
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row"><code>pointercancel</code></TableHeaderCell>
        <TableCell
          >The browser stops sending events for this pointer, for example because it started a
          scroll or a zoom with it.</TableCell
        >
      </TableRow>
    </TableBody>
  </Table>
  <p>
    Each event says what produced it. <code>pointerType</code> is <code>"mouse"</code>,
    <code>"pen"</code> or <code>"touch"</code>, and the W3C Pointer Events specification gives an
    empty string for a device the browser cannot identify. <code>pointerId</code> tells pointers
    apart, so two fingers on the screen are two ids with their own down, moves and up.
    <code>isPrimary</code> marks the first finger of a multi-finger touch, and
    <code>clientX</code>, <code>clientY</code> and <code>timeStamp</code> give the position and time that
    every gesture rule below is measured from.
  </p>
  <p>
    A browser still fires <code>click</code> after a tap, and also the older mouse events, which the
    specification calls compatibility mouse events. Calling <code>preventDefault()</code> on
    <code>pointerdown</code> stops the compatibility <code>mousedown</code> and
    <code>mouseup</code>, and the <code>mousemove</code> events while the pointer is down, but the
    specification says it "MUST NOT have an effect on whether click, auxclick, or contextmenu are
    fired". It also requires
    <code>click</code>, <code>auxclick</code> and <code>contextmenu</code> to be
    <code>PointerEvent</code>s, so a click handler can read <code>pointerType</code> too.
  </p>
</DocsSection>

<DocsSection title={TOUCH_SECTIONS.capture}>
  <p>
    Without capture, a pointer's events go to whatever element is under it. A drag that starts on a
    page and leaves it, or leaves the window, stops reaching the page's handlers, and the
    <code>pointerup</code> goes elsewhere. <code>element.setPointerCapture(pointerId)</code> sends
    every later event of that pointer to <code>element</code>, wherever the pointer goes, until it
    lifts or is canceled.
  </p>
  <p>
    Touch already behaves this way. The specification says a direct manipulation device such as a
    touch screen should act "exactly as if setPointerCapture was called on the target element just
    before" the <code>pointerdown</code> listeners run. A mouse gets no such capture, so code that tracks
    a mouse drag has to ask for it. This is a minimal tap and drag meter:
  </p>
  <DocsCode label="A minimal gesture meter" code={CAPTURE_EXAMPLE} />
</DocsSection>

<DocsSection title={TOUCH_SECTIONS.touchAction}>
  <p>
    A finger on a page has two possible owners: the page's script, and the browser's own panning and
    zooming. The CSS property <code>touch-action</code> says which gestures the browser may handle on
    an element. Its values from the Pointer Events and Compatibility specifications:
  </p>
  <ul>
    <li><code>auto</code>: the browser handles every pan and zoom.</li>
    <li><code>none</code>: the browser handles none, and every touch reaches the script.</li>
    <li><code>pan-x</code>, <code>pan-y</code>: one-finger panning along that axis.</li>
    <li><code>pinch-zoom</code>: multi-finger panning and zooming.</li>
    <li>
      <code>manipulation</code>: an alias for <code>pan-x pan-y pinch-zoom</code>. It allows
      everything except extra gestures such as a double tap to zoom.
    </li>
  </ul>
  <p>
    The value is read once, when the gesture starts, from the touched element and every ancestor up
    to the scrolling element, and the browser uses only what all of them allow. Once a pan or zoom
    has started, a change to <code>touch-action</code> is ignored until the gesture ends. And when
    the browser starts a pan with a finger, it fires <code>pointercancel</code> for that pointer and sends
    no more of its events. So a script that classifies a swipe on a scrollable page gets the first few
    moves, then a cancel, and never the release.
  </p>
</DocsSection>

<DocsSection title={TOUCH_SECTIONS.delay}>
  <p>
    Mobile browsers once waited about 300 ms after a tap before firing <code>click</code>. A double
    tap zoomed the page, and a single tap could only be told from the first half of a double tap by
    waiting to see whether a second one came. WebKit's own post on the change says double tapping is
    "two taps within a short time interval (350ms), WebKit must wait".
  </p>
  <p>
    The wait went away for pages that set up a mobile viewport. Chrome 32 dropped it for pages with
    <code>&lt;meta name="viewport" content="width=device-width"&gt;</code>. WebKit's post from
    December 2015 drops it for unscalable viewports, for <code>width=device-width</code> pages at
    their initial scale, and for any element with <code>touch-action: manipulation</code>. Dokseo's
    <code>app.html</code> sets <code>width=device-width, initial-scale=1</code>, so a tap's click
    arrives without the delay.
  </p>
  <p>
    The underlying problem has not gone away: whoever owns the double tap has to wait. A page that
    adds its own double tap has to hold a single tap back until the double-tap window passes, and
    Dokseo does exactly that in one zone of the page, as the next section shows.
  </p>
</DocsSection>

<DocsSection title={TOUCH_SECTIONS.classify}>
  <p>
    With pointer events, a gesture is a stream of samples: a position and a time for each down, move
    and up. Telling gestures apart comes down to three measurements.
  </p>
  <ul>
    <li>
      <strong>Distance.</strong> A finger is never perfectly still, so a tap allows some drift, the
      slop. In Dokseo a finger may move {TOUCH_SLOP_PX} px on either axis and still tap; a mouse, which
      does not wobble, gets {CLICK_SLOP_PX} px. Past the slop, the touch is a drag.
    </li>
    <li>
      <strong>Time.</strong> A finger held still for {LONG_PRESS_MS} ms is a long press. A second tap
      within {DOUBLE_TAP_MS} ms and {DOUBLE_TAP_SLOP_PX} px of the first is a double tap.
    </li>
    <li>
      <strong>Velocity.</strong> A drag that ends is a swipe only if it was mostly sideways (more
      than
      {SWIPE_AXIS_RATIO} times as far across as down) and either long ({SWIPE_MIN_PX} px) or fast ({SWIPE_MIN_PX_PER_MS}
      px per ms, so a 30 px flick in 100 ms counts).
    </li>
  </ul>
  <p>
    The order of the questions matters. A second finger before anything else makes a pinch. A move
    past the slop turns the press into a drag, and what kind of drag depends on the context: a
    selection in Select mode, a pan on a zoomed page, and otherwise a swipe. A finger that stays
    inside the slop for {LONG_PRESS_MS} ms becomes a long press. Only a finger that lifts before all of
    that is a tap.
  </p>
  <Figure>
    <Diagram {...GESTURE_TREE} />
    {#snippet caption()}
      How one touch becomes a gesture in Dokseo's classifier. The questions run top to bottom, and
      the first yes wins.
    {/snippet}
  </Figure>
  <p>
    Try each branch on the pad. A quick tap on a side reports at once. A tap in the center waits
    {DOUBLE_TAP_MS} ms before it reports, and two quick taps there make a double tap. A finger held still
    reports a long press at {LONG_PRESS_MS} ms, and a flick reports a swipe with its distance, time and
    speed. On a desktop, leave the first switch on and use the mouse.
  </p>
  <GesturePadDemo />
</DocsSection>

<DocsSection title={TOUCH_SECTIONS.media}>
  <p>
    Some decisions belong before any gesture: whether to show touch settings at all, for example.
    CSS media features describe the pointers a device has, and script reads them with
    <code>matchMedia(query).matches</code>.
  </p>
  <Table size="sm" caption="Four media features about pointers">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Feature</TableHeaderCell>
        <TableHeaderCell>Asks about</TableHeaderCell>
        <TableHeaderCell>Values</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableHeaderCell scope="row"><code>pointer</code></TableHeaderCell>
        <TableCell>The primary input's accuracy</TableCell>
        <TableCell><code>none</code>, <code>coarse</code>, <code>fine</code></TableCell>
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row"><code>any-pointer</code></TableHeaderCell>
        <TableCell>Every available input's accuracy</TableCell>
        <TableCell><code>none</code>, <code>coarse</code>, <code>fine</code></TableCell>
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row"><code>hover</code></TableHeaderCell>
        <TableCell>Whether the primary input can hover</TableCell>
        <TableCell><code>none</code>, <code>hover</code></TableCell>
      </TableRow>
      <TableRow>
        <TableHeaderCell scope="row"><code>any-hover</code></TableHeaderCell>
        <TableCell>Whether any available input can hover</TableCell>
        <TableCell><code>none</code>, <code>hover</code></TableCell>
      </TableRow>
    </TableBody>
  </Table>
  <p>
    A finger is <code>coarse</code> and cannot hover. A mouse is <code>fine</code> and can. The
    primary features describe one input, so a laptop with a touch screen and a trackpad still gets
    one answer for <code>pointer</code>. The <code>any-</code> features describe all of them, and
    MDN notes that "more than one value can match if the available devices have different
    characteristics": such a laptop matches both <code>(any-pointer: coarse)</code> and
    <code>(any-pointer: fine)</code>.
  </p>
  <p>
    The readout shows what this browser reports right now, and the buttons replay the answers of the
    devices in <a href={touchHref('ipad')}>the next section</a>. The fieldset under it is the one
    Dokseo's reader settings would show, which <a href={touchHref('settings')}>a later section</a>
    explains.
  </p>
  <PointerMediaDemo />
</DocsSection>

<DocsSection title={TOUCH_SECTIONS.ipad}>
  <p>
    An iPad shows why the choice of feature matters. WebKit answers the four features on iPadOS in
    <code>WebPageIOS.mm</code>, and the answers are not the obvious ones:
  </p>
  <ul>
    <li>
      <code>pointer</code> is <code>coarse</code> and <code>hover</code> is <code>none</code>,
      always. The primary input of an iPad is the touch screen, even with a trackpad attached.
    </li>
    <li>
      <code>any-pointer</code> adds <code>fine</code> for an attached mouse or trackpad, and also
      for a stylus. The stylus answer is UIKit's
      <code>UIScribbleInteraction.<wbr />isPencilInputExpected</code>, and WebKit's stylus observer
      keeps it on for 10 minutes after that turns false. So an iPad that has been used with an Apple
      Pencil matches <code>(any-pointer: fine)</code>, with nothing attached. WebKit bug 212580,
      "CSS any-pointer:fine media query false on iPad/Pencil", added this.
    </li>
    <li>
      <code>any-hover</code> is <code>hover</code> only when a mouse or trackpad is attached. A Pencil
      does not count. WebKit bug 209292 made the hover features answer for the mouse support added in
      iOS 13.4.
    </li>
  </ul>
  <p>
    So "this device has a mouse" is <code>(any-hover: hover)</code>, not
    <code>(any-pointer: fine)</code>. The second one is also true for a touch-only iPad whose owner
    took notes with a Pencil a few minutes ago.
  </p>
  <Figure>
    <Diagram {...DEVICE_SETTINGS} />
    {#snippet caption()}
      Which query each device matches, and which of Dokseo's page-turn settings follows from it. The
      edges are computed from the device answers with the real <code>pointerKinds</code>.
    {/snippet}
  </Figure>
</DocsSection>

<DocsSection title={TOUCH_SECTIONS.rtl}>
  <p>
    Japanese manga is read right to left: the spine is on the right, and the next page lies to the
    left. A tap or a swipe has a side, and which page that side means depends on the book.
  </p>
  <StepList>
    <StepItem title="A left-to-right book">
      Tapping the right side, or swiping the finger to the left, shows the next page. The page comes
      in from the right, like turning a sheet in a Western book.
    </StepItem>
    <StepItem title="A right-to-left book">
      Tapping the left side shows the next page, and a finger swiped to the right pulls it in from
      the left.
    </StepItem>
  </StepList>
  <p>
    The cheap way to get this wrong is to code "right means next" and add a flag later. Dokseo keeps
    the side and the meaning apart: a gesture produces a side, <code>'left'</code> or
    <code>'right'</code>, and one small function maps the side to previous or next through an order
    that depends on the book's reading direction. A swiped finger names the side the new page comes
    from, so a finger moving left gives <code>'right'</code>.
  </p>
</DocsSection>
