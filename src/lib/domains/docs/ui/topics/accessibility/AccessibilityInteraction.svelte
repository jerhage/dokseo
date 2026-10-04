<script lang="ts">
  import Diagram from '$lib/components/Diagram.svelte';
  import Figure from '$lib/components/Figure.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { KEY_DECISION } from './accessibility-diagrams';
  import {
    ACCESSIBILITY_SECTIONS,
    EPUB_VERTICAL_HREF,
    TOUCH_MEDIA_HREF,
    TOUCH_ZONES_HREF,
    UI_THEMES_HREF,
    UNICODE_LANG_HREF,
    UNICODE_RUBY_HREF,
  } from './accessibility-sections';
  import FocusTrapDemo from './FocusTrapDemo.svelte';
  import KeyboardPagingDemo from './KeyboardPagingDemo.svelte';
  import LiveRegionDemo from './LiveRegionDemo.svelte';
  import ReducedMotionDemo from './ReducedMotionDemo.svelte';

  const REDUCED_MOTION_EXAMPLE = `@media (prefers-reduced-motion: reduce) {
  .page-slide {
    transition: none;
  }
}

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
strip.scrollBy({ top: screen, behavior: reduced ? 'instant' : 'smooth' });`;

  const LIVE_EXAMPLE = `<div role="status"></div>
<div role="alert"></div>

status.textContent = 'Saved 3 captures';
alert.textContent = 'The capture could not be read.';`;

  const CONTRAST_FORMULA = `channel = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
L = 0.2126 * R + 0.7152 * G + 0.0722 * B
ratio = (L1 + 0.05) / (L2 + 0.05)`;
</script>

<DocsSection title={ACCESSIBILITY_SECTIONS.keys}>
  <p>
    A reading app turns pages with the keyboard: Space and the right arrow go forward, the left
    arrow goes back. The usual way to build that is one <code>keydown</code> listener on the
    <code>window</code>. A key event starts at the focused element and bubbles up through its
    ancestors to the window, so that listener hears every key press, wherever focus is.
  </p>
  <p>
    The browser also has its own <em>default action</em> for many keys, and it runs after the
    listeners unless one of them calls <code>preventDefault()</code>. Space on a focused button
    presses the button, because that is standard button behavior (the ARIA Authoring Practices Guide
    lists Space and Enter as the keys that activate a button). Space anywhere else scrolls the page.
    An arrow key in a text field moves the caret. An arrow key on a button does nothing at all. In
    Chromium and WebKit, I found that the button's <code>click</code> fires on Space's
    <code>keyup</code>, and that
    <code>preventDefault()</code> on the <code>keydown</code> cancels it.
  </p>
  <p>Two simple handlers each break paging in a different way. The first turns on every key:</p>
  <ol>
    <li>A reader clicks the Next page button with the mouse. Most browsers focus the button.</li>
    <li>They press Space to read on.</li>
    <li>
      The window listener turns the page. The key is not canceled, so the browser also presses the
      focused Next page button, which turns the page again. Two pages go by for one press.
    </li>
  </ol>
  <p>
    The obvious repair is to ignore keys while a button has focus, and that breaks the arrows
    instead:
  </p>
  <ol>
    <li>A reader clicks Next page with the mouse, and the button keeps focus.</li>
    <li>They press the right arrow.</li>
    <li>
      The handler returns early because the target is a button, and an arrow means nothing to a
      button, so nothing happens. The arrows stay dead until the reader clicks somewhere else. In
      Safari, which does not focus a clicked button, the same happens after reaching the button with
      Tab.
    </li>
  </ol>
  <p>
    The two keys need different handling because the focused button already has a use for one of
    them and none for the other. Space is the button's own key, so the handler leaves it to the
    button. An arrow is free, so the handler turns the page and cancels the key. A field that is
    typed into keeps every key.
  </p>
  <Figure>
    <Diagram {...KEY_DECISION} />
    {#snippet caption()}The decision a reader's key handler makes for each key.{/snippet}
  </Figure>
  <KeyboardPagingDemo />
  <p>
    The rule, per key: leave Space to a focused button, which presses it; turn the page on the arrow
    keys whatever button has focus; and leave every key to a field that is being typed into. Cancel
    a key only when the handler used it.
  </p>
</DocsSection>

<DocsSection title={ACCESSIBILITY_SECTIONS.dialogs}>
  <p>
    A <em>modal</em> dialog is one that has to be dealt with before anything else on the page. The
    ARIA Authoring Practices Guide's dialog pattern requires four things of one: when it opens,
    focus moves inside it; Tab and Shift+Tab move only among its own controls, wrapping from the
    last to the first; Escape closes it; and when it closes, focus returns to the control that
    opened it. Keeping Tab inside is called a <em>focus trap</em>. The page behind also has to
    disappear from the accessibility tree, or a screen reader user can still wander into it.
  </p>
  <p>
    HTML's <code>&lt;dialog&gt;</code> element, opened with <code>showModal()</code>, does most of
    this by itself. The HTML specification's steps for <code>showModal()</code> record the element
    that had focus, mark the document as blocked by the dialog, which makes everything outside it
    inert, and then run the dialog focusing steps: the dialog itself if it has
    <code>autofocus</code>, otherwise its first focusable descendant (preferring one with
    <code>autofocus</code>), otherwise the dialog. Escape fires a <code>cancel</code> event and closes
    the dialog unless the event is canceled. Closing a modal dialog focuses the recorded element again.
  </p>
  <p>
    One part is missing: the specification does not wrap Tab. In Chromium, I found that Tab past the
    last control of a modal dialog moves focus out of the page (to <code>body</code> in a test browser,
    to the browser's toolbar in a real one), and the next Tab comes back to the dialog's first control.
    The rest of the page stays inert throughout, so a dialog that must wrap handles Tab on its last and
    first control itself.
  </p>
  <p>
    The <code>inert</code> attribute does the same for any element: according to MDN, an inert
    subtree cannot be clicked, focused, found with find in page or selected, and is left out of the
    accessibility tree. It suits content that is on screen but should not be used, such as a hidden
    toolbar that is still in the layout. Before <code>&lt;dialog&gt;</code>, a focus trap was built
    from a Tab handler plus <code>aria-hidden</code> on everything outside; <code>showModal()</code>
    and
    <code>inert</code> replace most of that.
  </p>
  <FocusTrapDemo />
</DocsSection>

<DocsSection title={ACCESSIBILITY_SECTIONS.live}>
  <p>
    A toast saying "Saved" appears in a corner. A sighted reader glances at it; a screen reader user
    hears nothing, because nothing moved focus to it. WCAG 2.2's 4.1.3, Status Messages (level AA),
    requires that such messages can be presented without receiving focus. A <em>live region</em> is
    how: assistive technology announces changes to the content of an element marked with
    <code>aria-live</code>.
  </p>
  <ul>
    <li>
      <code>polite</code>: announced when the screen reader is idle, without interrupting what it is
      saying.
    </li>
    <li><code>assertive</code>: announced at once, interrupting current speech.</li>
    <li><code>off</code>: not announced.</li>
  </ul>
  <p>
    Two roles are live regions already. In WAI-ARIA 1.2, <code>role="status"</code> defaults to
    <code>aria-live="polite"</code> and <code>role="alert"</code> to <code>assertive</code>; both
    default to <code>aria-atomic="true"</code>, which reads the whole region on any change rather
    than just the changed part.
  </p>
  <DocsCode label="A status region and an alert region" code={LIVE_EXAMPLE} />
  <p>
    Whether anything is heard depends on two details. Only changes are announced, so MDN advises
    putting the region in the initial markup, empty, and writing into it later; a region inserted
    together with its message may be missed. And assertive interrupts, so it is for errors and
    time-critical messages only.
  </p>
  <LiveRegionDemo />
</DocsSection>

<DocsSection title={ACCESSIBILITY_SECTIONS.motion}>
  <p>
    Animation that slides, zooms or pans large areas can make people with vestibular disorders dizzy
    or sick. Operating systems have a setting for it: MDN lists Reduce motion under Accessibility on
    macOS and iOS, Animation effects on Windows 11, and Remove animations on Android 9 and later.
    CSS reads it with the <code>prefers-reduced-motion</code> media feature, whose values are
    <code>no-preference</code> and <code>reduce</code>, and script reads the same query with
    <code>matchMedia</code>.
  </p>
  <DocsCode label="Removing a slide and a smooth scroll" code={REDUCED_MOTION_EXAMPLE} />
  <p>
    Reduce does not have to mean nothing moves. The aim is to remove motion that is not needed to
    understand the change: a page turn can swap instead of sliding, and a scroll can jump instead of
    gliding. WCAG 2.2's 2.3.3, Animation from Interactions, is level AAA: motion started by an
    interaction can be turned off unless it is essential.
  </p>
  <ReducedMotionDemo />
</DocsSection>

<DocsSection title={ACCESSIBILITY_SECTIONS.color}>
  <p>
    Low contrast text is hard to read for people with low vision, and for everyone on a phone in
    sunlight. WCAG 2.2 measures contrast as a ratio of relative luminance, from 1:1 to 21:1:
  </p>
  <DocsCode label="Relative luminance of an sRGB color, then the ratio" code={CONTRAST_FORMULA} />
  <p>
    <code>c</code> is each channel from 0 to 1, and L1 is the lighter of the two colors. WCAG 2.2's
    1.4.3, Contrast (Minimum), level AA, requires 4.5:1 for text and 3:1 for large-scale text, which
    is at least 18 point, or 14 point bold, or an equivalent size for Chinese, Japanese and Korean
    fonts. 1.4.11, Non-text Contrast, level AA, requires 3:1 for the parts of controls and graphics
    that identify them: a field's border, a focus ring, an icon with no text. A ratio holds for one
    pair of colors, so every theme and both color schemes need their own check (<a
      href={UI_THEMES_HREF}>Themes</a
    > describes Dokseo's).
  </p>
  <p>
    WCAG 2.2's 1.4.1, Use of Color (level A), adds that color must not be the only way to tell
    something. A field whose border turns red on an error conveys nothing to someone who cannot tell
    red from grey, or to a screen reader; an icon, a written message and <code>aria-invalid</code> say
    it in three other ways.
  </p>
</DocsSection>

<DocsSection title={ACCESSIBILITY_SECTIONS.targets}>
  <p>
    A small control is hard to hit with a finger, with a tremor, or with a head pointer. WCAG 2.2's
    2.5.8, Target Size (Minimum), level AA, requires targets of at least 24 by 24 CSS pixels, with
    exceptions: an undersized target spaced so that 24-pixel circles centered on it do not overlap
    another target, a target with an equivalent elsewhere that meets the size, a link inside a
    sentence, a control whose size the browser sets, and a size that is essential. 2.5.5, Target
    Size (Enhanced), level AAA, requires 44 by 44.
  </p>
  <p>
    A reader has an advantage here: the page itself is the largest target, and tapping its sides is
    the main way to turn a page on a phone. <a href={TOUCH_ZONES_HREF}>Tap zones and swipe only</a>
    covers how Dokseo divides it, and <a href={TOUCH_MEDIA_HREF}>Which pointers a device has</a> the media
    queries that report a touch screen.
  </p>
</DocsSection>

<DocsSection title={ACCESSIBILITY_SECTIONS.text}>
  <p>
    A manga page is a picture. Drawn into a <code>&lt;canvas&gt;</code> or shown in an
    <code>&lt;img&gt;</code>, its speech bubbles are pixels: a screen reader has nothing to read but
    an image's <code>alt</code>, the text cannot be selected or copied, find in page cannot reach
    it, and a pop-up dictionary extension, which reads the text under the pointer or in the
    selection, has nothing to look up. Once OCR has read a bubble, the text exists, and how it is
    put on screen determines who can use it. Rendered as ordinary text in the DOM, it is in the
    accessibility tree, selectable, searchable, and readable by those extensions. Drawn back into a
    canvas, it would be pixels again.
  </p>
  <p>
    That text also needs its language. WCAG 2.2's 3.1.2, Language of Parts (level AA), requires that
    the language of each passage can be determined, which in HTML is the <code>lang</code> attribute
    on the element. A Japanese line inside a page whose <code>&lt;html&gt;</code> says
    <code>lang="en"</code>
    needs <code>lang="ja"</code>, so that assistive technology can use Japanese pronunciation, and
    so that the browser picks Japanese fonts and line breaking (<a href={UNICODE_LANG_HREF}
      >The language on each element</a
    >).
  </p>
  <p>
    Vertical text is a layout, not a different text. <code>writing-mode: vertical-rl</code> changes
    how lines are laid out (<a href={EPUB_VERTICAL_HREF}>Vertical text and right-to-left pages</a>),
    not the order of the characters in the document, and the accessibility tree follows the document
    order. In Chromium 153, I found a vertical paragraph exposed as the same text node as a
    horizontal one. For ruby (<a href={UNICODE_RUBY_HREF}>Ruby for furigana</a>), the same Chromium
    exposed a
    <code>&lt;ruby&gt;</code> element as a node whose text is the base, 漢字, with the reading,
    かんじ, as its description, and left the <code>&lt;rt&gt;</code> element itself out of the tree. How
    each screen reader then speaks vertical text and readings I have not tested.
  </p>
</DocsSection>
