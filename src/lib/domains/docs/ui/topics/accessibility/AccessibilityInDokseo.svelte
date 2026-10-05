<script lang="ts">
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import {
    ACCESSIBILITY_SECTIONS,
    EPUB_FRAMES_HREF,
    UI_COMPONENTS_HREF,
    UI_TOKENS_HREF,
    accessibilityHref,
  } from './accessibility-sections';
  import {
    ANNOUNCEMENT_ROLE,
    CAPTURE_STATUS,
    CAPTURE_TEXT,
    CAROUSEL_INERT,
    CAROUSEL_MOTION,
    CHROME_BAR_INERT,
    FIELD_CONTROL,
    FIELD_LABEL,
    FLOW_FOCUS_KINDS,
    FLOW_KEY_FOCUS,
    FLOW_KEY_MOVE,
    FLOW_ONKEY,
    FLOW_SLIDER_KEYS,
    HANDLES_OWN_SPACE,
    ICON_BUTTON_FACE,
    MODAL_SHOW,
    MODAL_WRAP,
    PAGED_SPACE,
    READER_ARROWS,
    REDUCED_MOTION_CSS,
    SCROLL_MOTION,
    TOAST_REGION,
    VISUALLY_HIDDEN,
    WRAPPED_STOP,
  } from './accessibility-snippets';
</script>

<DocsSection title={ACCESSIBILITY_SECTIONS.dokseoNames}>
  <p>
    Dokseo's screens are built from its own base components in <code>src/lib/ui/components/</code>
    (<a href={UI_COMPONENTS_HREF}>Base components</a>), so a name that a component guarantees is
    guaranteed on every screen. <code>IconButton</code> makes <code>label</code> a required string
    prop, and its props type removes <code>title</code>, <code>aria-label</code> and
    <code>aria-labelledby</code>, so a caller cannot name it any other way. The label goes into
    hidden text next to the icon:
  </p>
  <DocsCode label={ICON_BUTTON_FACE.label} code={ICON_BUTTON_FACE.code} />
  <DocsCode label={VISUALLY_HIDDEN.label} code={VISUALLY_HIDDEN.code} />
  <p>
    The same label is also the button's <code>title</code> tooltip, unless the caller passes its own
    <code>tooltip</code> text or <code>tooltip={'{'}false{'}'}</code>. The icons themselves get
    <code>aria-hidden="true"</code> unless they are given a role, a title or an <code>aria-</code>
    attribute, so an icon inside a named button adds nothing to its name.
  </p>
  <p>
    <code>Field</code> renders a real <code>&lt;label&gt;</code> tied to its control by id, even when
    the label is visually hidden, and passes the control the attributes that tie it to its hint and error:
  </p>
  <DocsCode label={FIELD_LABEL.label} code={FIELD_LABEL.code} />
  <DocsCode label={FIELD_CONTROL.label} code={FIELD_CONTROL.code} />
  <p>
    The error itself is an icon and a sentence, not only a red border, and with
    <code>announceError</code> it gets <code>role="alert"</code>. <code>Modal</code>'s props type is
    a union with three members: a <code>title</code>, which it renders as the heading the dialog's
    <code>aria-labelledby</code> refers to, or a custom header with a required
    <code>aria-label</code>, or one with a required <code>aria-labelledby</code>. A modal without a
    name does not type-check.
  </p>
</DocsSection>

<DocsSection title={ACCESSIBILITY_SECTIONS.dokseoKeys}>
  <p>
    The EPUB reader follows the per-key rule from <a href={accessibilityHref('keys')}
      >Turning pages with keys</a
    >. Its decision is a pure function in the flowing domain. First it sorts the focused element
    into one of four kinds:
  </p>
  <DocsCode label={FLOW_KEY_FOCUS.label} code={FLOW_KEY_FOCUS.code} />
  <DocsCode label={FLOW_FOCUS_KINDS.label} code={FLOW_FOCUS_KINDS.code} />
  <p>
    A text field, a select or editable content is <code>typing</code>. A range input is a
    <code>slider</code>, not typing. A <code>BUTTON</code> or anything with
    <code>role="button"</code> is a <code>button</code>. Everything else, the page itself included,
    is <code>elsewhere</code>. Then each kind gets its own rule:
  </p>
  <DocsCode label={FLOW_KEY_MOVE.label} code={FLOW_KEY_MOVE.code} />
  <DocsCode label={FLOW_SLIDER_KEYS.label} code={FLOW_SLIDER_KEYS.code} />
  <p>
    Space goes forward and Shift+Space back. The arrows, Page Up and Page Down turn the page, and
    the left and right arrows move toward that side of the screen, so in a right-to-left book the
    left arrow goes forward. Typing keeps every key. A focused button keeps Space, which the browser
    uses to press it, and every other key still turns the page. A focused slider, such as the
    reader's progress slider, keeps the arrows, Page Up, Page Down, Home and End, so the browser
    steps the slider; its <code>change</code> goes through the same seek as a drag, so the reading
    position moves with the slider. Space over the slider still turns the page. Any press with Alt,
    Ctrl or Meta is left alone. Because <code>keyMove</code> matches on a union with
    <code>.exhaustive()</code>, a fifth kind of focus would not compile until it had a rule.
  </p>
  <DocsCode label={FLOW_ONKEY.label} code={FLOW_ONKEY.code} />
  <p>
    The listener returns early while the contents or the settings dialog is open. A chapter is a
    separate document in a frame (<a href={EPUB_FRAMES_HREF}>Chapters in blob frames</a>), and a key
    pressed while focus is inside the frame fires in that document, not in the host window, so the
    reader adds the same listener to each chapter document as well. The specs in
    <code>flow-turn.spec.ts</code> state the rule as test names, among them "leaves Space to a button
    and to anything wearing its role", "turns the page on every other key over a focused button" and "leaves
    every arrow, Page Up, Page Down, Home and End to the slider".
  </p>
  <p>
    The image reader has the same split, for a different reason. Its side arrows turn the page and
    follow the book's reading direction; in a vertical strip they do nothing:
  </p>
  <DocsCode label={READER_ARROWS.label} code={READER_ARROWS.code} />
  <p>
    <code>handlesOwnKeys</code> returns true for a text field, a select and editable content, but not
    for a button, so the arrows still turn the page after a click on a toolbar button. Space does not
    turn pages here: held down, it turns a drag into a pan. It goes through a second guard that adds the
    button case, so Space still presses a focused button:
  </p>
  <DocsCode label={HANDLES_OWN_SPACE.label} code={HANDLES_OWN_SPACE.code} />
  <DocsCode label={PAGED_SPACE.label} code={PAGED_SPACE.code} />
</DocsSection>

<DocsSection title={ACCESSIBILITY_SECTIONS.dokseoDialogs}>
  <p>
    Every modal dialog in Dokseo is the base <code>Modal</code>, which renders a
    <code>&lt;dialog&gt;</code> and opens it with <code>showModal()</code>, so the page behind is
    inert and Escape reaches it as a <code>cancel</code> event. Right after
    <code>showModal()</code>, it moves focus to an element with <code>autofocus</code> inside the dialog,
    or else to its close button:
  </p>
  <DocsCode label={MODAL_SHOW.label} code={MODAL_SHOW.code} />
  <p>
    Its <code>cancel</code> handler calls <code>preventDefault()</code> and starts the closing
    animation;
    <code>close()</code> runs when the animation has ended. <code>Modal</code> has no code that puts
    focus back: closing a modal <code>&lt;dialog&gt;</code> returns focus to the element that had it,
    by the browser's own steps, which the focus demo above shows. A click that starts and ends on the
    backdrop closes it too.
  </p>
  <p>
    Tab is wrapped only where it was asked for. <code>Modal</code> takes a <code>wrapFocus</code>
    prop, and only the capture search dialog passes it. Its <code>keydown</code> moves Tab on the last
    stop to the first and Shift+Tab on the first to the last, and leaves every other Tab to the browser:
  </p>
  <DocsCode label={MODAL_WRAP.label} code={MODAL_WRAP.code} />
  <DocsCode label={WRAPPED_STOP.label} code={WRAPPED_STOP.code} />
</DocsSection>

<DocsSection title={ACCESSIBILITY_SECTIONS.dokseoHidden}>
  <p>
    Both readers hide their top and bottom bars while a page is read and show them on a tap. A
    hidden bar fades to <code>opacity: 0</code> and ignores the pointer, but it stays in the layout,
    so without more it would still take Tab and still be read out. <code>ChromeBar</code> sets
    <code>inert</code> whenever the bar is not shown:
  </p>
  <DocsCode label={CHROME_BAR_INERT.label} code={CHROME_BAR_INERT.code} />
  <p>
    The page carousel in the image reader keeps the pages before and after the current one rendered
    for the slide, and makes them inert, so only the page in view can be reached:
  </p>
  <DocsCode label={CAROUSEL_INERT.label} code={CAROUSEL_INERT.code} />
  <p>
    The paged viewer's frame around the pages is a <code>role="group"</code> named "Pages in view",
    with
    <code>tabindex="-1"</code>: focusable from script and by a click, but not a Tab stop.
  </p>
</DocsSection>

<DocsSection title={ACCESSIBILITY_SECTIONS.dokseoLive}>
  <p>
    The root layout renders a <code>ToastRegion</code> for the whole app, and an open
    <code>Modal</code> renders a second one inside its dialog, which takes the toasts while the dialog
    is open, so a toast shown over a dialog is inside it rather than in the inert page. Both are manual
    popovers and polite live regions:
  </p>
  <DocsCode label={TOAST_REGION.label} code={TOAST_REGION.code} />
  <p>Each toast also takes a role from its variant, through one exhaustive match:</p>
  <DocsCode label={ANNOUNCEMENT_ROLE.label} code={ANNOUNCEMENT_ROLE.code} />
  <p>
    Messages that have no toast use status regions in place. The captures panel keeps two visually
    hidden ones: one reports the model download while a capture waits, as "Reading the selection."
    or the download's progress in percent, and one says "Copied the text" after a copy.
  </p>
  <DocsCode label={CAPTURE_STATUS.label} code={CAPTURE_STATUS.code} />
  <p>
    The library search's match count, the capture search's result count and a removal message in the
    engine settings are <code>role="status"</code> too, and a reader warning and a failed read of
    the tags are alerts. SvelteKit's route announcer is there as well, but the app's own screens set
    no
    <code>&lt;title&gt;</code>, so after a navigation it receives <code>untitled page</code>; only
    these docs pages and the playground set one.
  </p>
</DocsSection>

<DocsSection title={ACCESSIBILITY_SECTIONS.dokseoMotion}>
  <p>
    Reduced motion is handled once in the global stylesheet. The block in the overrides layer, the
    last layer, sets every transition to zero and turns off the named entrance and exit animations,
    among them those of toasts, the modal, dropdown menus, tab panels, accordions and skeletons.
  </p>
  <DocsCode label={REDUCED_MOTION_CSS.label} code={REDUCED_MOTION_CSS.code} />
  <p>
    Two motions come from script, and each reads the media query through Svelte's
    <code>MediaQuery</code>. The page carousel stops a page from following the finger during a
    swipe, so the swipe still turns the page but nothing slides:
  </p>
  <DocsCode label={CAROUSEL_MOTION.label} code={CAROUSEL_MOTION.code} />
  <p>
    In the vertical strip, the Previous screen and Next screen buttons scroll by a screen, and the
    scroll jumps instead of gliding:
  </p>
  <DocsCode label={SCROLL_MOTION.label} code={SCROLL_MOTION.code} />
</DocsSection>

<DocsSection title={ACCESSIBILITY_SECTIONS.dokseoText}>
  <p>
    Dokseo's project rules say it in one line: recognized text is text. The page image stays on the
    canvas, and the text OCR reads from it is rendered as ordinary text in the light DOM, never
    drawn into a canvas. A capture card shows it as a paragraph with the book's language:
  </p>
  <DocsCode label={CAPTURE_TEXT.label} code={CAPTURE_TEXT.code} />
  <p>
    So a screen reader reads it, it can be selected and copied, and a dictionary extension finds it
    the way it finds text on any page. Dokseo ships no dictionary of its own for that reason. The
    same attribute appears on book titles, chapter names and capture places, with the language set
    per book; the font that <code>lang</code> selects comes from the design tokens (<a
      href={UI_TOKENS_HREF}>Tokens in Dokseo</a
    >).
  </p>
</DocsSection>

<DocsSection title={ACCESSIBILITY_SECTIONS.rules}>
  <ul>
    <li>Use the native element first; reach for ARIA only where HTML has nothing.</li>
    <li>
      Give every control a name that contains its visible words; make the name a required prop of a
      component that has no visible text.
    </li>
    <li>Keep the tab order in document order: only <code>tabindex</code> 0 and -1.</li>
    <li>
      Decide keys one at a time: leave Space to a focused button, turn the page on the arrows over a
      button, leave every key to a field that is typed into, and cancel only a key that was used.
    </li>
    <li>
      Open modal dialogs with <code>showModal()</code>, focus inside on open, and let the browser
      return focus on close; wrap Tab where the dialog needs it.
    </li>
    <li>Make anything on screen but out of use <code>inert</code>.</li>
    <li>
      Keep live regions in the page from the start and write into them; polite for news, alert for
      failures.
    </li>
    <li>
      Turn off slides, zooms and smooth scrolls under <code>prefers-reduced-motion: reduce</code>.
    </li>
    <li>Never show a state by color alone, and check contrast in every theme and scheme.</li>
    <li>Render recognized text as text in the DOM, with its <code>lang</code>.</li>
  </ul>
</DocsSection>
