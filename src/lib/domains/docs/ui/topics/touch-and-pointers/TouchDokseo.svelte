<script lang="ts">
  import { DOUBLE_TAP_MS, LONG_PRESS_MS } from '$lib/ui/components/gesture';
  import { MIN_SELECTION_PX } from '$lib/domains/viewing/domain/selection';
  import { EDGE_CLICKS_KEY, EDGE_CLICKS_LABEL } from '$lib/shared/edge-clicks-setting';
  import { TOUCH_GUIDE_LABEL } from '$lib/shared/guide-kind';
  import { CLICK_EDGE_SHARE, EDGE_GUTTER_PX, SIDE_ZONE_SHARE } from '$lib/shared/page-turn';
  import { SEEN_GUIDES_KEY } from '$lib/shared/seen-guides.svelte';
  import { TOUCH_TURNS_CHOICES, TOUCH_TURNS_KEY } from '$lib/shared/touch-turns';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import MarqueeDemo from './MarqueeDemo.svelte';
  import { TOUCH_SECTIONS, touchHref } from './sections';
  import TapZoneDemo from './TapZoneDemo.svelte';
  import {
    CLICK_SLOP,
    GESTURE_DEADLINE,
    GESTURE_STATE,
    GESTURE_STEP,
    MARQUEE_END,
    MARQUEE_END_RULE,
    MEDIA_MATCHES,
    MOVE_ORDER,
    SHOWN_TURN_SETTINGS,
    SWIPE_TURN,
    TAP_ACTION,
    TAP_ZONE,
  } from './touch-snippets';

  const sidePercent = Math.round(SIDE_ZONE_SHARE * 100);
  const centrePercent = 100 - 2 * sidePercent;
  const edgePercent = Math.round(CLICK_EDGE_SHARE * 100);
  const [tapZonesChoice, swipeOnlyChoice] = TOUCH_TURNS_CHOICES;
</script>

<DocsSection title={TOUCH_SECTIONS.classifier}>
  <p>
    Dokseo has three readers: a paged image reader for manga, a vertical strip for webtoons, and an
    EPUB reader. The two image readers share one touch classifier, <code>gestureStep</code> in
    <code>src/lib/ui/components/gesture.ts</code>. It is a pure function: it takes the current
    state, one input and some context, and returns the next state and an intent. It keeps no timers
    and touches no DOM, so a unit test can play a whole gesture through it as a list of samples.
  </p>
  <p>The states name every point a touch can be at:</p>
  <DocsCode label={GESTURE_STATE.label} code={GESTURE_STATE.code} />
  <p>
    An intent is what the gesture means so far: <code>tap</code>, <code>double-tap</code>,
    <code>long-press</code>, <code>pan</code>, <code>pan-end</code>, <code>pinch</code>,
    <code>swipe</code>, three <code>select-</code> steps, <code>cancel</code>, or
    <code>none</code>. The classifier reads only touch. Every other pointer type returns the state
    unchanged, because a mouse already has its own paths: a drag selects, a click taps, and a drag
    with space held or with the middle button pans.
  </p>
  <DocsCode label={GESTURE_STEP.label} code={GESTURE_STEP.code} />
  <p>
    Time is the awkward part. A long press has to fire after {LONG_PRESS_MS} ms even though no event arrives
    then, and a waiting tap has to be sent when the {DOUBLE_TAP_MS} ms window closes. A pure function
    cannot set a timer, so <code>gestureDeadline</code> names the next moment that matters, and
    <code>GestureFeed</code>
    in <code>gesture-feed.ts</code> schedules one timer for it and feeds a <code>tick</code> input
    back in. The feed takes a <code>Clock</code>, so a test replaces real time with a manual one.
  </p>
  <DocsCode label={GESTURE_DEADLINE.label} code={GESTURE_DEADLINE.code} />
  <p>
    The context is where each reader differs. <code>pannable</code> is true on a zoomed page, so a
    drag pans it. <code>selectMode</code> is the header toggle that makes a one-finger drag draw a
    selection at once. <code>waitsForDoubleTap</code> says where a tap must wait for a possible second
    one: the paged reader waits only in the center zone, where a double tap zooms, so a tap on a side
    turns the page with no delay. The strip waits nowhere.
  </p>
  <p>
    The paged reader then turns the intent into an action with <code>touchAction</code>, in
    <code>src/lib/domains/viewing/ui/touch-action.ts</code>. For a tap:
  </p>
  <DocsCode label={TAP_ACTION.label} code={TAP_ACTION.code} />
  <p>
    For any of this to work, the browser must leave the fingers alone. The paged reader's frame has
    <code>touch-action: none</code>, takes pointer capture on <code>pointerdown</code>, and stops
    the <code>contextmenu</code> that follows a touch press, along with the iOS image callout and
    text selection, through <code>-webkit-touch-callout</code> and <code>user-select</code>. The
    strip cannot do the same, because it has to scroll natively; its scroller keeps
    <code>touch-action: pan-x pan-y</code> and holds the scroll from a non-passive
    <code>touchmove</code> listener only once a long press has started a selection or a second finger
    has landed.
  </p>
</DocsSection>

<DocsSection title={TOUCH_SECTIONS.zones}>
  <p>
    The settings of a paged book and of an EPUB offer "Page turns", one choice for both readers,
    saved under <code>{TOUCH_TURNS_KEY}</code>. The strip has no side zones and ignores it.
  </p>
  <ul>
    <li>
      <strong>{tapZonesChoice?.label}.</strong> The page splits into three zones, {sidePercent} percent,
      {centrePercent} percent and {sidePercent} percent across. A tap on a side turns the page, a tap
      in the center shows the bars, and a sideways swipe also turns.
    </li>
    <li>
      <strong>{swipeOnlyChoice?.label}.</strong> Every tap shows the bars and only a swipe turns. A
      swipe that starts within {EDGE_GUTTER_PX} px of the window's edge is ignored, because iOS Safari
      uses an edge swipe for back and forward.
    </li>
  </ul>
  <p>
    Swipe only is the default. I was not sure I liked tapping to turn pages, so I built both behind
    a switch, tried them on a phone, and kept the switch as a setting. In both, a tap while the bars
    show only hides them, so a tap meant to close the menu never turns a page.
  </p>
  <DocsCode label={TAP_ZONE.label} code={TAP_ZONE.code} />
  <p>
    A swipe passes when it is far enough or fast enough, after the axis check from
    <a href={touchHref('classify')}>the classification rules</a>:
  </p>
  <DocsCode label={SWIPE_TURN.label} code={SWIPE_TURN.code} />
  <p>
    Each rule returns a side, and the reader turns the side into a page move through its reading
    order. For the paged reader, a right-to-left book puts the increment first:
  </p>
  <DocsCode label={MOVE_ORDER.label} code={MOVE_ORDER.code} />
  <p>
    On a zoomed page a drag pans instead of swiping. Once the page reaches its edge, the travel the
    page could not absorb counts as a swipe, so pushing past the edge turns the page. Change the
    direction and the setting below, and press anywhere on the page to see what a tap there does.
  </p>
  <TapZoneDemo />
</DocsSection>

<DocsSection title={TOUCH_SECTIONS.edges}>
  <p>
    A mouse never reaches the classifier. In the paged reader and the EPUB reader, a mouse or pen
    click in the outer {edgePercent} percent of the page turns it, and a click anywhere else shows or
    hides the bars. The tap map above shows both widths with its pointer switch.
  </p>
  <p>
    The setting "{EDGE_CLICKS_LABEL}" turns edge clicks off, so every click only shows or hides the
    bars. It is on by default and saved under <code>{EDGE_CLICKS_KEY}</code>. A touch is not
    affected by it, because touch has its own setting.
  </p>
</DocsSection>

<DocsSection title={TOUCH_SECTIONS.settings}>
  <p>
    The two settings answer different devices, so the reader settings show each only where it
    applies: the touch choice where a finger exists, the edge toggle where a mouse or trackpad
    exists, both on a device with both. The decision is one function in
    <code>src/lib/shared/turn-settings.ts</code>:
  </p>
  <DocsCode label={SHOWN_TURN_SETTINGS.label} code={SHOWN_TURN_SETTINGS.code} />
  <p>
    It takes the <code>matchMedia</code> read as a parameter, typed <code>MediaMatches</code>,
    instead of calling it. The live app passes the real read, below, and the unit test passes a
    function that describes one device by the queries it matches. A test row for the iPad with a
    Pencil fails if the edge query goes back to <code>(any-pointer: fine)</code>.
  </p>
  <DocsCode label={MEDIA_MATCHES.label} code={MEDIA_MATCHES.code} />
  <p>
    The edge toggle first showed where <code>(any-pointer: fine)</code> matched. On a touch-only
    iPad, the settings then offered "{EDGE_CLICKS_LABEL}" next to the touch choice. The cause was
    the Pencil answer described in <a href={touchHref('ipad')}>the iPad section</a>, and the fix was
    the hover query. The diagram there shows the result for each device, and the demo in
    <a href={touchHref('media')}>the media section</a> runs this function on this device.
  </p>
  <p>
    The settings dialog is always mounted, so a read when it mounts would be a snapshot from when
    the book opened. The reader reads the media again in the handler that opens the dialog, so an
    iPad that gains a trackpad shows the edge toggle the next time the settings open.
  </p>
</DocsSection>

<DocsSection title={TOUCH_SECTIONS.marquee}>
  <p>
    Dokseo's main job on a page is a capture: the reader draws a rectangle around a speech bubble,
    and OCR reads the text in it. The rectangle is the base component <code>MarqueeSelection</code>.
    A mouse or pen draws by dragging. When the pointer lifts, the drag ends in one of three named
    ways:
  </p>
  <DocsCode label={MARQUEE_END.label} code={MARQUEE_END.code} />
  <DocsCode label={MARQUEE_END_RULE.label} code={MARQUEE_END_RULE.code} />
  <p>
    A <code>click</code> stayed inside the slop and is passed on as a tap, which turns the page or
    shows the bars. A <code>selection</code> is at least {MIN_SELECTION_PX} px on both axes and becomes
    a capture when it covers a page. A <code>too-small</code> is neither, and does nothing. That third
    case is the reason for the union. When the end was decided by two checks in a row, a drag that ended
    too small fell through to the tap path, and finishing a drag showed the bars. Naming each end makes
    the reader handle each one, and a fourth one would fail to compile until handled.
  </p>
  <DocsCode label={CLICK_SLOP.label} code={CLICK_SLOP.code} />
  <p>
    A finger draws through the classifier instead. A long press, or any drag in Select mode,
    produces the <code>select-</code> intents, and the reader calls the marquee's
    <code>beginAt</code>,
    <code>extendTo</code> and <code>endAt</code>. These end through the same code as a mouse drag,
    so a region is measured and committed one way. The one difference: a touch selection that ends
    as a click taps nothing, because the classifier has already reported every tap.
  </p>
  <MarqueeDemo />
</DocsSection>

<DocsSection title={TOUCH_SECTIONS.guide}>
  <p>
    Tap zones and swipes are invisible, so the first time a book opens on a touch device, the reader
    lays a guide over the page. Its content follows the setting and the book:
  </p>
  <ul>
    <li>
      In tap zones, the three zones are drawn and labeled Previous, Menu and Next, mirrored for a
      right-to-left book.
    </li>
    <li>
      In swipe only, one line says which way to swipe, such as "Swipe left for the next page".
    </li>
    <li>
      The strip says "Swipe up or down to scroll", and a vertical EPUB "Swipe up or down to turn the
      page".
    </li>
  </ul>
  <p>
    The guide shows only for touch: the last pointer type that pressed, or
    <code>(pointer: coarse)</code> before anything has pressed. Any touch on it dismisses it without
    acting on the page, and records its kind under <code>{SEEN_GUIDES_KEY}</code>. Because the
    record is per kind, switching to tap zones shows the zone guide once even after the swipe guide
    was seen. The "{TOUCH_GUIDE_LABEL}" button in the reader settings shows it again.
  </p>
</DocsSection>
