<script lang="ts">
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { NEXT_FRAME } from './async-examples';
  import {
    ASYNC_SECTIONS,
    EPUB_LOCK_HREF,
    OFFLINE_CHECK_HREF,
    OFFLINE_ROUTING_HREF,
    SECURITY_WEBKIT_FAILURE_HREF,
    WORKERS_HREF,
    asyncHref,
  } from './async-sections';
  import { ANIMATIONS, FIRST_RUN, IMPORT_NOW, RECHECK, ZIP_STOP } from './async-snippets';
</script>

<DocsSection title={ASYNC_SECTIONS.deadline}>
  <p>
    Dokseo runs OCR in a <a href={WORKERS_HREF}>worker</a>, on the GPU through WebGPU when the
    browser offers it. In Firefox I saw the model open on WebGPU without complaint, and then the
    first recognition never finished: its promise stayed pending, and a second attempt failed inside
    the inference. A <code>catch</code> around the open could not catch this, and a
    <code>catch</code> around the read could not catch a wait that never ends.
  </p>
  <p>
    So the first run on the GPU races a deadline. A rejection and a timeout give the same answer,
    "it did not run", and either one sends the worker back to open the model on the CPU and read the
    same crop again, so the request still gets its text.
  </p>
  <DocsCode label={FIRST_RUN.label} code={FIRST_RUN.code} />
  <p>A few details follow from the earlier sections:</p>
  <ul>
    <li>
      The run that lost is abandoned, not canceled: ONNX Runtime has no way to stop a running
      inference. <code>running.then(…, …)</code> attaches both handlers the moment the race starts, so
      if the abandoned run rejects later, the rejection is handled.
    </li>
    <li>
      Only the first run is timed. One run that finishes proves the GPU works, and timing every run
      would eventually fall back to the CPU because of one slow page.
    </li>
    <li>
      The deadline, <code>FIRST_GPU_RUN_DEADLINE_MS</code>, is 15 seconds, chosen against a false
      fallback rather than against the wait. A first GPU run compiles shaders for the model, which a
      slow integrated GPU can take a long time to do, and a false fallback costs the GPU for the
      rest of the session.
    </li>
  </ul>
  <p>
    The deadline's timer is not cleared when the run wins. It resolves 15 seconds later into a race
    that has already settled, which costs one pending timer and nothing else.
  </p>
</DocsSection>

<DocsSection title={ASYNC_SECTIONS.zip}>
  <p>
    The only <code>AbortController</code> in Dokseo's app code stops work that has done enough. To lay
    out an image book stored in a ZIP archive, Dokseo needs each page's width and height, which sit in
    the first bytes of each image. For an image stored compressed in the ZIP, those bytes come out of
    a decompression stream, and reading the whole entry would inflate the entire picture to learn two
    numbers.
  </p>
  <DocsCode label={ZIP_STOP.label} code={ZIP_STOP.code} />
  <p>
    The stream's sink parses the header after each chunk and aborts as soon as it has a size, or
    after 256 KB without one. zip.js passes the signal to the stream pipe, so the abort stops the
    decompression, and the promise from <code>getData</code> rejects. Here that rejection is the
    expected end, so <code>.catch(() =&gt; undefined)</code> drops it, and the size is read from
    <code>read</code>, which the sink filled in.
  </p>
  <p>
    The function that reads every page's size, <code>entryImageSizes</code>, reads the entries one
    at a time and checks a <code>closed()</code> function before each one. If the book was closed in the
    meantime, it stops with a named outcome instead of reading on. Checking a flag between steps is the
    simplest cancellation there is, and it works for any code you write yourself.
  </p>
</DocsSection>

<DocsSection title={ASYNC_SECTIONS.animations}>
  <p>
    A modal and a toast in Dokseo animate out before they are removed, so the code waits for their
    animations to end. Every running animation has a <code>finished</code> promise, and waiting on
    all of them looks like a one-liner. Two kinds of animation break it: one that repeats forever
    never finishes, so its promise never settles, and one that is canceled rejects its promise with
    an
    <code>AbortError</code>.
  </p>
  <DocsCode label={ANIMATIONS.label} code={ANIMATIONS.code} />
  <p>
    So <code>animationsSettled</code> leaves out any animation with infinite iterations and waits
    with <code>Promise.allSettled</code>, so a canceled animation counts as done instead of failing
    the wait.
  </p>
</DocsSection>

<DocsSection title={ASYNC_SECTIONS.importFinally}>
  <p>
    Importing a captures file writes to the database, and every screen reads the database through a
    cache. <code>CapturesImportView.importNow</code> refreshes that cache in <code>finally</code>,
    so the screens show what the database holds after the import, whether the import succeeded or
    threw.
  </p>
  <DocsCode label={IMPORT_NOW.label} code={IMPORT_NOW.code} />
  <p>
    The first lines are the double-submit check. The method returns unless the state holds a plan to
    import,
    <code>preview</code> or <code>reviewing</code>, and it sets the state to <code>importing</code>
    before its first
    <code>await</code>, so a second call finds it busy and returns. Because the refresh is awaited
    inside <code>finally</code>, a refresh that rejects would replace the import's own error, as
    described under <a href={asyncHref('finally')}>cleaning up with finally</a>.
  </p>
</DocsSection>

<DocsSection title={ASYNC_SECTIONS.foliate}>
  <p>
    EPUB books in Dokseo are laid out by foliate-js, a library whose page turns are asynchronous.
    Its paginator turns one page at a time with a private <code>#locked</code> field: while a turn
    runs, another press returns at once and is dropped. That is the "ignore" answer to a double
    submit, applied to page turns, and it has the weakness of every lock around a wait. A turn whose
    chapter frame never loads never releases the lock, and after that no tap, key or button turns a
    page. Both are told under <a href={EPUB_LOCK_HREF}>the turn lock</a>.
  </p>
  <p>
    foliate-js's <code>load()</code> is the never-settling promise from
    <a href={SECURITY_WEBKIT_FAILURE_HREF}>the Safari frame-ancestors failure</a>: when a chapter
    frame arrives with no document, the listener that should resolve it throws first.
  </p>
  <p>
    The paginator lays out pages from a <code>ResizeObserver</code> callback, and the browser delivers
    that callback in a rendering step, between tasks, wherever the next frame falls. Opening an EPUB sometimes
    failed with "Something went wrong" because that first notification landed while the first chapter's
    frame had a root element but no body yet, and the layout code threw. Dokseo now waits one animation
    frame after opening the view, before it requests the first chapter, which lets that notification arrive
    before the chapter starts loading:
  </p>
  <DocsCode label="Waiting for one animation frame" code={NEXT_FRAME} />
</DocsSection>

<DocsSection title={ASYNC_SECTIONS.updates}>
  <p>
    Dokseo checks for a new version in the background every 30 minutes, and whenever the tab becomes
    visible again. That check is a promise nobody waits for, so its failures need a destination of
    their own:
  </p>
  <DocsCode label={RECHECK.label} code={RECHECK.code} />
  <p>
    A network failure is expected on a train or in airplane mode, so it is dropped. Anything else is
    logged, not toasted, because a background check that fails should not interrupt reading. The
    check you start from Settings is awaited instead, and it turns every outcome into a named result
    with its own message; those outcomes are under
    <a href={OFFLINE_CHECK_HREF}>checking for updates on request</a>. The service worker's own wait
    for the network, with its 3 second limit, is under
    <a href={OFFLINE_ROUTING_HREF}>which request gets which strategy</a>.
  </p>
</DocsSection>

<DocsSection title={ASYNC_SECTIONS.rules}>
  <p>What the code above follows, written as rules:</p>
  <ul>
    <li>
      After every <code>await</code> in a view model, check that the screen is still the one the work
      started for, with a generation or a round, and release whatever a stale answer holds.
    </li>
    <li>
      Give every wait on something outside Dokseo's control a deadline or a named way out, and clean
      up the timer and the listener whichever side wins.
    </li>
    <li>
      Set the busy state before the first <code>await</code>, and check it in the method, not only
      in a disabled button.
    </li>
    <li>
      Mark a promise that is started and not awaited with <code>void</code>, and give its failure a
      destination: a <code>catch</code> for an expected failure, the window's
      <code>unhandledrejection</code> listener for the rest.
    </li>
    <li>Put work that must follow every outcome in <code>finally</code>.</li>
    <li>
      Call a feature that needs user activation with no <code>await</code> before it in the click handler,
      and build what it needs before the click.
    </li>
  </ul>
</DocsSection>
