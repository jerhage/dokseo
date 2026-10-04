<script lang="ts">
  import StepItem from '$lib/components/StepItem.svelte';
  import StepList from '$lib/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { TOUCH_SECTIONS, touchHref } from './sections';
  import { CLAIMS_TOUCH_END } from './touch-snippets';
</script>

<DocsSection title={TOUCH_SECTIONS.epub}>
  <p>
    The EPUB reader works differently. foliate-js lays each chapter out in its own frame and handles
    a swipe itself: the page follows the finger and snaps to a page when it lifts. So the EPUB
    reader does not run the gesture classifier. It records each <code>pointerdown</code>, and on
    <code>pointerup</code> it checks two things, in <code>flow-turn.ts</code>: whether text is now
    selected, and whether the pointer stayed within the slop. With no text selected and no drift, it
    is a tap, and its zone comes from the same <code>tapZone</code> for a finger and the same outer tenth
    for a mouse. Anything else is left to foliate.
  </p>
  <p>
    foliate has a turn lock. While a turn that crosses into another chapter is loading, every other
    <code>next</code>, <code>prev</code> or <code>goTo</code> returns at once and does nothing. The
    <a href="/docs/epub-rendering">EPUB rendering</a> page explains the lock. Here is the bug it caused
    through a tap, reported as "taps stop turning after Go to passage":
  </p>
  <StepList>
    <StepItem title="Tap the next-page side on a chapter's last page">
      Dokseo calls foliate's <code>next()</code>, which scrolls to the blank page at the chapter's
      edge and starts loading the next chapter, with the lock set.
    </StepItem>
    <StepItem title="foliate's own touchend runs">
      foliate snaps to the nearest page on every <code>touchend</code>, a tap included. The snap
      reads the blank edge page and starts a second chapter load beside the first.
    </StepItem>
    <StepItem title="One frame never loads">
      One of the two chapter frames never fires <code>load</code>, so the turn never finishes and
      the lock stays set.
    </StepItem>
    <StepItem title="Every turn stops">
      Taps, the footer buttons, the arrow keys and Go to passage all do nothing, while a swipe,
      which is foliate's own snap, still moves the page.
    </StepItem>
  </StepList>
  <p>
    The first tap after a jump only hid the bars, so it looked like taps stopped after two. The fix
    keeps that one <code>touchend</code> from foliate. <code>FlowGestures</code> records that a
    touch release turned the page, and a capture-phase <code>touchend</code> listener on the stage and
    on each chapter document stops the event before foliate's listener runs, once per press:
  </p>
  <DocsCode label={CLAIMS_TOUCH_END.label} code={CLAIMS_TOUCH_END.code} />
  <p>
    A swipe and a tap that does not turn still reach foliate. Delaying the turn until after the
    snap, and changing foliate's code, were both rejected. Taking touches away from foliate
    wholesale had already failed once: an earlier fix for vertical books stopped every swipe before
    foliate and turned it with <code>goLeft</code> and <code>goRight</code> like a tap. On a phone it
    sent the page back and forth, left the lock stuck, and lost the page following the finger, so it was
    removed whole.
  </p>
</DocsSection>

<DocsSection title={TOUCH_SECTIONS.rules}>
  <ul>
    <li>
      Split input by <code>pointerType</code>. A finger, a mouse and a pen each get their own path,
      and settings for one never show for another.
    </li>
    <li>
      Decide a gesture from its samples: distance against the slop, time against the long press and
      the double-tap window, and speed for a swipe. Keep that decision in a pure function, with time
      fed in as ticks, so a test can replay any gesture.
    </li>
    <li>
      Set <code>touch-action</code> on the surface that owns the gesture, and take pointer capture
      on
      <code>pointerdown</code>. Where the browser has to keep scrolling, take the touch only after a
      long press or a second finger.
    </li>
    <li>
      Wait for a double tap only where a double tap does something, so a page turn is never late.
    </li>
    <li>
      Ask <code>(any-hover: hover)</code> for a mouse or trackpad, never
      <code>(any-pointer: fine)</code>, which an Apple Pencil also turns on. Read the media when the
      settings open, not once at load.
    </li>
    <li>
      Map a side to a page through the book's reading order, so a right-to-left book needs no
      special case. See <a href={touchHref('rtl')}>right-to-left page order</a>.
    </li>
    <li>Name every way a drag can end, and never let a finished drag fall through to a tap.</li>
    <li>
      When a library handles touches itself, let it keep them, and stop only the one event of a tap
      that already turned the page.
    </li>
  </ul>
</DocsSection>
