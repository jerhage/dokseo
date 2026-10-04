<script lang="ts">
  import Diagram from '$lib/components/Diagram.svelte';
  import Figure from '$lib/components/Figure.svelte';
  import StepItem from '$lib/components/StepItem.svelte';
  import StepList from '$lib/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { DOM_TO_ASSISTIVE } from './accessibility-diagrams';
  import { ACCESSIBILITY_SECTIONS, accessibilityHref } from './accessibility-sections';
  import NameInspectorDemo from './NameInspectorDemo.svelte';

  const DIV_BUTTON = `<div role="button" tabindex="0" onclick="next()" onkeydown="...">
  Next page
</div>`;

  const NAMES_EXAMPLE = `<label for="title">Title</label>
<input id="title" aria-describedby="title-hint">
<p id="title-hint">As it appears on the shelf.</p>

<button aria-label="Close"><svg aria-hidden="true">…</svg></button>

<dialog aria-labelledby="settings-title">
  <h2 id="settings-title">Reading settings</h2>
</dialog>`;
</script>

<DocsSection title={ACCESSIBILITY_SECTIONS.tree}>
  <p>
    People reach a web page in more ways than a mouse and a screen. A screen reader speaks the page
    or shows it on a braille display. Voice control lets a person say the name of a button to press
    it. Switch access steps through the page one control at a time, driven by one or two physical
    switches. None of these reads the pixels. They read a second description of the page that the
    browser builds for them, the <em>accessibility tree</em>.
  </p>
  <p>
    The browser builds the tree from the DOM and its CSS. Each node in it has a <em>role</em>, what
    kind of thing it is (a button, a link, a heading, a text field); a <em>name</em>, the words that
    identify it ("Save"); and <em>states and properties</em>, such as focusable, disabled, expanded
    or invalid. Nodes that mean nothing on their own, such as most <code>div</code> wrappers, are
    left out or flattened, and so is anything hidden with <code>display: none</code>,
    <code>visibility: hidden</code> or <code>aria-hidden="true"</code>.
  </p>
  <p>
    The tree reaches assistive technology through the operating system's accessibility API. The W3C
    Core Accessibility API Mappings specification maps roles and states to five of them: MSAA with
    IAccessible2 and UI Automation on Windows, ATK and AT-SPI on Linux, the AX API on macOS and iOS,
    and Android's accessibility API.
  </p>
  <Figure>
    <Diagram {...DOM_TO_ASSISTIVE} />
    {#snippet caption()}From markup to the person using it.{/snippet}
  </Figure>
  <p>
    So the markup is the interface for these readers. A <code
      >&lt;button&gt;Save&lt;/button&gt;</code
    >
    becomes a node with role button and name "Save", and a screen reader announces both. WCAG 2.2's success
    criterion 4.1.2, Name, Role, Value (level A), requires exactly this of every control: that its name
    and role can be determined by software, and that its states can be read and changed. The accessibility
    pane in the browser's developer tools shows the node for the selected element.
  </p>
</DocsSection>

<DocsSection title={ACCESSIBILITY_SECTIONS.semantics}>
  <p>
    A native element brings its role, its keyboard behavior and its states with it. A
    <code>&lt;button&gt;</code> is in the tab order, Enter and Space press it, <code>disabled</code>
    takes it out of both, and it has role button in the tree. A <code>&lt;div&gt;</code> with a click
    handler has none of that: it is not focusable, a key does nothing to it, and its role is generic.
  </p>
  <p>
    ARIA, Accessible Rich Internet Applications, is a set of attributes that change the tree:
    <code>role</code>, and the <code>aria-*</code> states and properties. It changes nothing else.
    <code>role="button"</code> on that <code>div</code> makes the tree say button, but the element
    still needs <code>tabindex="0"</code> to be focusable and a <code>keydown</code> handler for Enter
    and Space:
  </p>
  <DocsCode label="Rebuilding a button by hand" code={DIV_BUTTON} />
  <p>
    Each of those is a step that can be forgotten, and the name inspector below shows the result
    when it is: a div with a button role that has a name and a role, but no key presses it. The W3C
    note Using ARIA states this as its first rule: if a native HTML element or attribute already has
    the semantics and behavior you need, use it instead of repurposing an element and adding ARIA.
    Its other rules: do not change native semantics unless you really have to; every interactive
    ARIA control must be usable with the keyboard; and never put <code>role="presentation"</code> or
    <code>aria-hidden="true"</code> on a focusable element.
  </p>
  <p>
    ARIA is for the gaps HTML leaves. HTML has no tab list, so a tab strip uses
    <code>role="tablist"</code> and <code>role="tab"</code>. A button that opens and closes a panel
    reports that with <code>aria-expanded</code>. A message that should be read out without moving
    focus goes in a live region (<a href={accessibilityHref('live')}>Live regions</a>).
  </p>
</DocsSection>

<DocsSection title={ACCESSIBILITY_SECTIONS.names}>
  <p>
    The W3C Accessible Name and Description Computation specification gives the order in which a
    browser looks for an element's name. It takes the first of these that gives a non-empty name:
  </p>
  <StepList>
    <StepItem title="Hidden">
      <p>A hidden element has no name, unless another element's label refers to it.</p>
    </StepItem>
    <StepItem title="aria-labelledby">
      <p>
        The text of the elements whose ids it lists, in that order. A dialog named by its own
        heading uses this.
      </p>
    </StepItem>
    <StepItem title="aria-label">
      <p>A string on the element itself, for a control with no visible text.</p>
    </StepItem>
    <StepItem title="The host language's label">
      <p>
        In HTML, a <code>&lt;label&gt;</code> tied to the control by <code>for</code> or by wrapping
        it, or <code>alt</code> on an image.
      </p>
    </StepItem>
    <StepItem title="Content">
      <p>
        The text inside the element, but only for roles that take their name from content: a button,
        a link, a heading, a tab, an option. A generic <code>div</code> does not.
      </p>
    </StepItem>
    <StepItem title="Tooltip">
      <p>
        The <code>title</code> attribute. For a text input, HTML's mapping rules then try
        <code>placeholder</code>.
      </p>
    </StepItem>
  </StepList>
  <p>
    A <em>description</em> is a second, longer text read after the name, usually from
    <code>aria-describedby</code>, which lists the ids of a hint or an error message. Text can be in
    the tree without being on screen: a class that clips an element to one pixel keeps its text in
    the tree, where <code>display: none</code> would remove it. That is how an icon button keeps a name
    while it shows only an icon.
  </p>
  <DocsCode
    label="A label, a description, an aria-label and a labelling heading"
    code={NAMES_EXAMPLE}
  />
  <p>
    A placeholder is a weak name: it disappears as soon as someone types, and the browser uses it
    only when nothing else names the field. And the name should contain the words on screen. WCAG
    2.2's 2.5.3, Label in Name (level A), requires that, because a voice control user says the words
    they see, and saying "Contents" finds nothing when the button's name is "Table of chapters".
  </p>
  <NameInspectorDemo />
</DocsSection>

<DocsSection title={ACCESSIBILITY_SECTIONS.focus}>
  <p>
    Keyboard events go to one element at a time, the one with <em>focus</em>. Tab moves focus to the
    next element in the <em>tab order</em>, and Shift+Tab to the previous one. By default the tab
    order is the document order of the focusable elements: links with an <code>href</code>, buttons,
    form fields, <code>summary</code>, and anything with a <code>tabindex</code> of 0 or more.
  </p>
  <p><code>tabindex</code> changes that, and its three kinds of value behave differently:</p>
  <ul>
    <li>
      <code>-1</code>: focusable from script with <code>element.focus()</code> or by a click, but Tab
      skips it. Useful for a container that receives focus on purpose, such as a dialog body or the reading
      area of a viewer.
    </li>
    <li>
      <code>0</code>: in the tab order, in document order. It makes a custom control reachable, and
      it adds a stop that does nothing when it is put on plain content.
    </li>
    <li>
      A positive value: before every element with 0 or none, ordered by the number. MDN recommends
      only 0 and -1, because a positive value takes the element out of the order a reader sees and
      every later change to the page has to keep the numbers right.
    </li>
  </ul>
  <p>
    The same problem comes from CSS that moves things around: <code>order</code>, a reversed flex
    direction or a grid placement changes where an element appears but not where Tab finds it. WCAG
    2.2's 2.4.3, Focus Order (level A), requires an order that preserves meaning and operation.
  </p>
  <p>
    A person on a keyboard has to see where focus is. WCAG 2.2's 2.4.7, Focus Visible (level AA),
    requires a visible indicator, and 2.4.11, Focus Not Obscured (level AA), requires that the
    focused element is not entirely hidden by other content, such as a sticky bar. The CSS
    pseudo-class
    <code>:focus-visible</code> matches when the browser's heuristics say an indicator helps: after
    a key press, yes; after a mouse click on a button, usually not. Styling
    <code>:focus-visible</code> instead of <code>:focus</code> shows the ring to keyboard users without
    showing it after every click.
  </p>
  <p>
    Browsers differ in how they treat a click. MDN notes that most browsers focus a button when it
    is clicked and Safari, by design, does not. Safari's Tab key also skips links and buttons unless
    the setting "Press Tab to highlight each item on a webpage" is on in its Advanced settings; in
    my own runs in Playwright's WebKit, Tab from one button skipped the button next to it. A
    keyboard test in Safari needs that setting on.
  </p>
</DocsSection>

<DocsSection title={ACCESSIBILITY_SECTIONS.routes}>
  <p>
    In a site of separate pages, following a link loads a new document. Focus starts again at the
    top, and a screen reader announces the new page's title. A single-page app changes the content
    with script instead, and neither happens by itself:
  </p>
  <ol>
    <li>A keyboard user focuses a link in a list and presses Enter.</li>
    <li>The app renders the new screen, and the list, with the focused link, is removed.</li>
    <li>
      Focus falls back to the <code>body</code>. Nothing is announced, and the next Tab starts from
      wherever the browser now considers the start point.
    </li>
  </ol>
  <p>
    SvelteKit handles both halves for every client-side navigation. In the installed version,
    2.70.3,
    <code>reset_focus</code> in <code>src/runtime/client/client.js</code> focuses the first element
    with <code>autofocus</code> on the new page, or else the element the URL's fragment names, or
    else the <code>body</code> (given <code>tabindex="-1"</code> for a moment so that it can take
    focus). The root component it generates also renders a visually hidden
    <code>&lt;div id="svelte-announcer" aria-live="assertive" aria-atomic="true"&gt;</code> and
    writes the new <code>document.title</code> into it after each navigation, or
    <code>untitled page</code> when the title is empty. A navigation that should leave focus where
    it is, such as one that only updates the URL, passes <code>keepFocus: true</code> to
    <code>goto</code>.
  </p>
</DocsSection>
