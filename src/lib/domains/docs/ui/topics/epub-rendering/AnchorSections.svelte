<script lang="ts">
  import StepItem from '$lib/components/StepItem.svelte';
  import StepList from '$lib/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { EPUB_SECTIONS, epubSectionHref, SECURITY_WEBKIT_HREF } from './epub-sections';
  import {
    ARRIVAL_NOTICES,
    GO_TO_PASSAGE,
    KEEP_TAP,
    LOCATE_QUOTE,
    TURN_LOCK,
  } from './epub-snippets';
  import type { FlowKit } from './flow-kit';
  import ReanchorDemo from './ReanchorDemo.svelte';
  import TitleDemo from './TitleDemo.svelte';
  import TurnLockDemo from './TurnLockDemo.svelte';

  type Props = { kit: FlowKit };

  let { kit }: Props = $props();
</script>

<DocsSection title={EPUB_SECTIONS.anchoring}>
  <p>
    In the flow reader, selecting text and pressing the pencil saves the passage as a capture. The
    capture stores a text anchor, built by <code>selectedPassage</code> in
    <code>flow-passage.ts</code> from the selection's range, with two independent ways back to the passage.
  </p>
  <ul>
    <li>
      <strong>A CFI.</strong> <code>view.getCFI(index, range)</code> joins the spine step of the chapter
      to the path of the range inside it.
    </li>
    <li>
      <strong>A quote.</strong> The selected text as <code>exact</code>, up to 32 characters before
      it as <code>prefix</code> and up to 32 after it as <code>suffix</code>, counted in code
      points.
    </li>
  </ul>
  <p>
    All three strings leave out furigana. Asked for its text, a range over
    <code>&lt;ruby&gt;鍵&lt;rt&gt;かぎ&lt;/rt&gt;&lt;/ruby&gt;</code> returns <code>鍵かぎ</code>,
    the word and its reading run together, which nobody could search for. So Dokseo clones the
    range, deletes the <code>rt</code> and <code>rp</code> elements from the copy and reads what is left.
  </p>
  <p>
    The CFI is exact, but it is a list of child positions, and anything that moves the text under it
    breaks it: a new edition of the book, or a change in how Dokseo sanitizes chapters. The quote is
    the fallback. Going back to a capture runs <code>goToPassage</code>:
  </p>
  <DocsCode label={GO_TO_PASSAGE.label} code={GO_TO_PASSAGE.code} />
  <StepList>
    <StepItem title="Try the stored CFI">
      If foliate-js resolves it and lands, that is the answer, and the reader shows no notice.
    </StepItem>
    <StepItem title="Search for the quote">
      Otherwise <code>passageCfi</code> walks every chapter. It parses the chapter, runs the same
      sanitizer that ran on the rendered chapter (so the DOM it searches is the DOM on screen),
      joins the text outside <code>rt</code>, <code>rp</code>, <code>script</code> and
      <code>style</code>, and looks for <code>exact</code>. Short quotes repeat, so every occurrence
      is scored by how much of the prefix and suffix agrees around it, and the best one wins.
    </StepItem>
    <StepItem title="Go to the fresh CFI">
      The range it found gets a new CFI from <code>getCFI</code>, and the reader goes there and says
      that the passage moved.
    </StepItem>
  </StepList>
  <DocsCode label={LOCATE_QUOTE.label} code={LOCATE_QUOTE.code} />
  <p>
    The outcome is a union of three, <code>cfi</code>, <code>quote</code> and <code>lost</code>, and
    the last two each have a notice:
  </p>
  <DocsCode label={ARRIVAL_NOTICES.label} code={ARRIVAL_NOTICES.code} />
  <ReanchorDemo {kit} />
  <p>
    The four editions show where the line falls. When a failed CFI is tried, foliate-js logs the
    failure to the console as an error, which is the expected path.
  </p>
  <ul>
    <li>
      <strong>A foreword chapter.</strong> The CFI's <code>/4</code> now names the first chapter.
      Its id assertion, <code>[ref-ch2]</code>, names the right <code>itemref</code>, but foliate-js
      1.0.1 drops it: its <code>resolveCFI</code> retries without the assertion whenever the element
      it found is not named <code>idref</code>, and an <code>itemref</code> element never is. The offsets
      do not fit the first chapter, the navigation throws, and the quote finds the passage.
    </li>
    <li>
      <strong>A paragraph above it.</strong> <code>/12</code> now names a paragraph with no ruby and so
      no third run of text. The path fails, and the quote finds the passage.
    </li>
    <li>
      <strong>An edit to the sentence before it.</strong> Four characters are added in the same run of
      text. The path still exists and the offsets still fit, so the CFI lands four characters early, with
      no notice. The ring shows the shifted text.
    </li>
    <li>
      <strong>The chapter wrapped in a section.</strong> The paragraph's path no longer exists, and the
      quote finds the passage.
    </li>
  </ul>
  <p>
    Dokseo follows any CFI that resolves. The quote rescues a passage whose path broke, not one
    whose path still leads somewhere else.
  </p>
</DocsSection>

<DocsSection title={EPUB_SECTIONS.lock}>
  <p>
    A page turn in foliate-js is asynchronous, and the paginator lets only one run at a time. The
    lock is a private field, <code>#locked</code>:
  </p>
  <DocsCode label={TURN_LOCK.label} code={TURN_LOCK.code} />
  <StepList>
    <StepItem title="A press arrives">
      A tap at the page edge, an arrow key or a footer button ends in <code>next()</code> or
      <code>prev()</code>. If the lock is set, the call returns at once and the press is dropped,
      not queued. <code>goTo</code>, which a jump to a passage or a contents entry uses, does the
      same.
    </StepItem>
    <StepItem title="The page scrolls">
      The paginator sets the lock and scrolls one page. When that lands on the blank page past the
      end of the chapter, the turn has to leave the chapter.
    </StepItem>
    <StepItem title="A chapter loads">
      <code>#goTo</code> loads the next section: the loader mints its <code>blob:</code> URLs, the frame
      loads, the chapter is laid out in columns, and the paginator scrolls to its first page.
    </StepItem>
    <StepItem title="A final wait">
      Without the <code>animated</code> attribute, which Dokseo does not set, the turn then waits 100
      ms, after every turn, and only then releases the lock.
    </StepItem>
  </StepList>
  <p>
    So taps faster than about ten a second turn fewer pages than they were, and a turn across a
    chapter break holds the lock for the whole chapter load. Try both: ten presses from the start of
    a chapter, then ten from the last page of the first one. Each line lists the spine position
    after every turn that got through.
  </p>
  <TurnLockDemo {kit} />
  <p>The lock is only safe if every turn finishes. On a phone, one did not.</p>
  <StepList>
    <StepItem title="A tap turns the last page of a chapter">
      Dokseo calls <code>next()</code>. The paginator scrolls to the blank page past the end and
      starts loading the next chapter.
    </StepItem>
    <StepItem title="The same tap's touchend reaches foliate-js">
      foliate-js snaps to the nearest page after every <code>touchend</code>. The snap lands on the
      blank edge page and starts a second chapter load beside the first.
    </StepItem>
    <StepItem title="One frame never loads">
      The turn waits for it forever, so <code>#locked</code> stays set.
    </StepItem>
    <StepItem title="Nothing turns any more">
      Every tap, button, key and jump returns at once. Only a swipe still moves the page, because
      foliate-js handles swipes on its own.
    </StepItem>
  </StepList>
  <p>
    It was reported as taps that stop working after Go to passage, because the first tap after a
    jump only hides the bars. The fix keeps a turning tap's <code>touchend</code> away from
    foliate-js.
    <code>FlowGestures</code> records that a touch release turned the page, and a capture-phase listener
    on the stage and on every chapter document stops that one event. Swipes and taps that do not turn
    still reach foliate-js.
  </p>
  <DocsCode label={KEEP_TAP.label} code={KEEP_TAP.code} />
</DocsSection>

<DocsSection title={EPUB_SECTIONS.bugs}>
  <p>
    The frames and the asynchronous turns are where the flow reader's bugs have come from. Two more
    are worth knowing before changing it.
  </p>
  <StepList>
    <StepItem title="“Opening this book…” after every page turn">
      A turn saves the reading place, and the save refreshes the book's library record. The record
      reached <code>FlowViewer</code> as a new object with the same id. The stage's attachment read
      <code>book.id</code> through that object, so it depended on the object, ran again, and closed
      and reopened the book. It now depends on <code>$derived(book.id)</code>, a string that changes
      only when the book does, and opens inside <code>untrack</code>.
    </StepItem>
    <StepItem title="An error toast on leaving, in Safari and Firefox">
      Svelte removes a component's DOM before its attachment's teardown runs, so foliate-js was
      destroyed after its chapter frame had left the document. It could no longer stop observing the
      chapter's body, and WebKit and Gecko then delivered that observer's callback to a view with no
      document, which threw. The read route now closes the book in <code>onNavigate</code>, before
      SvelteKit swaps the page. The EPUB demos close their books the same way.
    </StepItem>
    <StepItem title="The first tap after opening, still open">
      On a phone, the first tap after opening an EPUB neither turns the page nor toggles the bars.
      The cause is not found yet. The two candidates are the gesture guide that opens over a new
      book on a touch screen, and a tap lost on the way to the frame.
    </StepItem>
  </StepList>
  <p>
    The mixed writing modes are told under
    <a href={epubSectionHref('probe')}>finding a book's writing mode</a>, the stuck lock under
    <a href={epubSectionHref('lock')}>the turn lock</a>, and the Safari failure, where no EPUB would
    open because of a response header, under
    <a href={SECURITY_WEBKIT_HREF}>the Safari frame-ancestors failure</a>.
  </p>
</DocsSection>

<DocsSection title={EPUB_SECTIONS.title}>
  <p>
    Dokseo reads the title once, when the book is imported, not when it opens.
    <code>readEpubPackage</code> pulls the layout, the spine's direction, <code>dc:title</code> and
    <code>dc:language</code> out of the package. The book is stored under its
    <code>dc:title</code>, trimmed, if <code>plausibleTitle</code> accepts it, and under its file
    name without the extension otherwise. <code>plausibleTitle</code> rejects blank text,
    <code>Untitled</code> and <code>Untitled document</code>, names that end in <code>.doc</code>,
    <code>.docx</code>, <code>.pdf</code>, <code>.indd</code>, <code>.rtf</code> or
    <code>.odt</code>, and file paths, which authoring tools leave in the title. Type one of those
    below and the title falls back to the file name.
  </p>
  <TitleDemo />
  <p>
    EPUBs were once titled by their file name alone, and a book stored then keeps the title it was
    stored with.
  </p>
</DocsSection>

<DocsSection title={EPUB_SECTIONS.rules}>
  <ul>
    <li>
      Destroy foliate-js while its chapter frame is still in the document. Close the book before a
      navigation swaps the page, not in a teardown that runs after Svelte removed the DOM.
    </li>
    <li>Never let a touchend whose tap turned the page reach foliate-js.</li>
    <li>
      Leave swipes to foliate-js. Turning pages from Dokseo's own touch code leaves its turn lock
      stuck.
    </li>
    <li>
      Restyle through <code>setStyles</code> and let the paginator keep the place. Saving a CFI and going
      back to it after a restyle is coarser than the range the paginator already holds.
    </li>
    <li>
      Read why the place changed from the renderer's <code>relocate</code> event. The view's own
      <code>relocate</code> event drops the reason, and a reason of <code>anchor</code> is a reflow, not
      the reader moving.
    </li>
    <li>
      Sort CFIs with <code>compare</code> from <code>foliate-js/epubcfi.js</code>. As strings,
      <code>/6/14</code> sorts before <code>/6/4</code>.
    </li>
    <li>
      Mint a CFI from a sanitized chapter, never from the raw document
      <code>createDocument</code> returns, or the path will not match the chapter on screen.
    </li>
    <li>Check every change to a response header in WebKit as well as in Chromium.</li>
  </ul>
</DocsSection>
