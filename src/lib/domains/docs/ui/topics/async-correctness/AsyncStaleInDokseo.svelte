<script lang="ts">
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import {
    ASYNC_SECTIONS,
    EXPORT_FIRST_HREF,
    EXPORT_SAVE_FILE_HREF,
    asyncHref,
  } from './async-sections';
  import {
    BLOCKED_PATIENCE,
    EXPORT_ROUNDS,
    READER_OPEN,
    READER_PICTURE,
    WINDOW_ERROR,
    WINDOW_LISTENERS,
  } from './async-snippets';
  import StaleExportDemo from './StaleExportDemo.svelte';
</script>

<DocsSection title={ASYNC_SECTIONS.generations}>
  <p>
    The image reader in Dokseo opens a book, then loads page pictures as you turn. You can leave a
    book or open another one while any of that is still loading. <code>ReaderView</code> counts each
    opening in a private field, <code>#generation</code>: <code>open()</code> takes the next number,
    and <code>dispose()</code>, which runs when the read screen closes, moves it on too. After every
    <code>await</code>, the method compares the number it started with against the field.
  </p>
  <DocsCode label={READER_OPEN.label} code={READER_OPEN.code} />
  <p>
    The comparison does more than drop the answer. A stale answer can own something: here, an opened
    page source, which has a <code>close()</code> method because it holds the book's pages. Dropping it
    without closing it would leak it, so the stale branch closes it. A page picture that arrives for a
    book that is no longer open is released the same way:
  </p>
  <DocsCode label={READER_PICTURE.label} code={READER_PICTURE.code} />
  <p>
    The same counter appears wherever a screen can move on during a wait. <code>FlowView</code>, the
    EPUB reader's view model, keeps its own <code>#generation</code>. The read of the page sizes
    checks the reader's counter too, and the book preferences receive it as a function and check it
    after their own await. On the OCR engine settings screen, the download and the removal of a
    model share one
    <code>OperationClock</code>, so a newer operation on that screen makes an older one's late
    reports stale.
  </p>
</DocsSection>

<DocsSection title={ASYNC_SECTIONS.exportRound}>
  <p>
    Three dialogs delete captures for good, and each offers to export them first, as
    <a href={EXPORT_FIRST_HREF}>export before a permanent delete</a> describes. To call the share
    sheet with the tap's activation intact, the export file is built when the dialog opens, not when
    the button is pressed. <code>BookCapturesExport</code> holds that file, and
    <code>prepare(book)</code> builds it.
  </p>
  <p>
    <code>prepare</code> can run more than once: the Clear all dialog calls it each time it opens,
    and the captures can change in between. So <code>BookCapturesExport</code> counts rounds, the
    request id from above under another name. Each <code>prepare</code> starts a round, and an
    answer is applied only if its round is still the latest. <code>save</code> notes the round when
    it starts, so a <code>prepare</code> during a save makes the save's outcome stale as well.
  </p>
  <DocsCode label={EXPORT_ROUNDS.label} code={EXPORT_ROUNDS.code} />
  <p>
    The demo below runs the real class with a stand-in for the database read. Prepare Harbor Lights
    with a slow read and Night Ferry with a fast one: Harbor Lights answers last, and the state
    still holds the Night Ferry file.
  </p>
  <StaleExportDemo />
  <p>
    <code>save</code> also covers <a href={asyncHref('double')}>the double submit</a> both ways.
    While a save runs, the state is <code>saving</code>, which holds no file to save, so a second
    call returns at once. And <code>BookCapturesExportButton</code> passes <code>disabled</code> and
    <code>loading</code> to the button while the save is busy. What the save itself does is under
    <a href={EXPORT_SAVE_FILE_HREF}>Dokseo's saveFile</a>.
  </p>
  <p>
    Both methods rethrow an unexpected failure after putting the state back. Their callers start
    them with <code>void</code>, as in <code>void view.save()</code>, so such a failure becomes an
    unhandled rejection on purpose, and the next section is where it goes.
  </p>
</DocsSection>

<DocsSection title={ASYNC_SECTIONS.boundary}>
  <p>
    Dokseo resolves expected failures, such as a missing file or a blocked store, as named outcomes,
    and lets only unexpected ones throw. Every unexpected failure that nothing catches ends in one
    place. The root layout listens on the window for both kinds of uncaught failure:
    <code>error</code> for an exception thrown from a task, and <code>unhandledrejection</code> for a
    promise.
  </p>
  <DocsCode label={WINDOW_LISTENERS.label} code={WINDOW_LISTENERS.code} />
  <p>
    <code>UnexpectedFailures</code> logs the failure with <code>console.error</code>, prefixed with
    where it came from, and shows one danger toast titled "Something went wrong" with the cause. If
    that toast is still on screen, a second failure is logged but not shown again, so a burst of
    failures does not stack toasts.
  </p>
  <p>
    One window error is left out. If a <code>ResizeObserver</code> callback changes the size of observed
    elements, the rendering step gathers notifications again, each round only for elements deeper in the
    tree than the round before. The ones it has to skip are reported as an error event with the message
    "ResizeObserver loop completed with undelivered notifications." It comes with no error object and
    no fault in Dokseo's code, and toasting it would show "Something went wrong" for nothing:
  </p>
  <DocsCode label={WINDOW_ERROR.label} code={WINDOW_ERROR.code} />
  <p>
    The check matches the exact message and requires the error object to be missing, so a real
    exception that happens to mention the same words still reaches the toast.
  </p>
</DocsSection>

<DocsSection title={ASYNC_SECTIONS.blocked}>
  <p>
    Opening an IndexedDB database at a new version upgrades it, and the upgrade cannot start while
    another tab holds a connection at the old version. The browser sends that tab a
    <code>versionchange</code> event, and if the connection stays open, it fires
    <code>blocked</code> at the opening request. The open does not fail: it waits, for as long as the
    other tab keeps its connection.
  </p>
  <p>
    Dokseo's own tabs close their connection when <code>versionchange</code> arrives, so a block
    should clear quickly. In case it does not, the open has a deadline: <code>blocked</code> starts
    a 10 second timer, <code>BLOCKED_PATIENCE_MS</code>, and when it runs out the open rejects with
    the message "Close or reload the other tabs, then try again."
  </p>
  <DocsCode label={BLOCKED_PATIENCE.label} code={BLOCKED_PATIENCE.code} />
  <p>
    The timeout stops the waiting, not the open, so the other tab can still let go later and the
    open can still succeed. The <code>abandoned</code> flag handles that case: a connection that arrives
    after the deadline is closed at once instead of being kept by code that has already given up on it.
  </p>
  <p>
    The same module also shares work between callers. It keeps the pending open per database name
    and returns the same promise to every caller during that open, and it drops a promise that
    rejected, so the next caller tries again.
  </p>
</DocsSection>
