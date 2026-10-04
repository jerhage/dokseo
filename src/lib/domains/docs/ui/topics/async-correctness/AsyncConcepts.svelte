<script lang="ts">
  import Diagram from '$lib/components/Diagram.svelte';
  import Figure from '$lib/components/Figure.svelte';
  import StepItem from '$lib/components/StepItem.svelte';
  import StepList from '$lib/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { EVENT_LOOP, STALE_RACE } from './async-diagrams';
  import {
    ABORT_EARLIER,
    AWAIT_GAP,
    EVENT_PROMISE,
    REQUEST_ID,
    SIGNAL_CONSUMERS,
    SIGNAL_HELPERS,
  } from './async-examples';
  import { ASYNC_SECTIONS, SECURITY_WEBKIT_FAILURE_HREF, asyncHref } from './async-sections';
  import EventLoopDemo from './EventLoopDemo.svelte';
  import RaceDemo from './RaceDemo.svelte';
</script>

<DocsSection title={ASYNC_SECTIONS.loop}>
  <p>
    The JavaScript on a web page runs on one thread, the main thread, which it shares with layout,
    painting and input handling. A function that starts running runs to its end: no other script can
    interrupt it halfway. Which piece of script runs next comes from the event loop, which the HTML
    standard defines step by step.
  </p>
  <p>The loop works with two kinds of queue and one recurring step:</p>
  <ul>
    <li>
      <strong>Task queues</strong> hold whole units of work: a timer that fired, a click, a message from
      a worker, a network response. Each turn of the loop takes one task and runs it. There are several
      task queues, and the standard lets the browser choose which one to take from, so a timer and a click
      that are both waiting can run in either order.
    </li>
    <li>
      <strong>The microtask queue</strong> holds promise reactions: the callbacks given to
      <code>then</code>, the rest of an <code>async</code> function after an <code>await</code>, and
      anything passed to <code>queueMicrotask</code>. After every task, and after every callback the
      browser calls when no other script is running, the loop performs a microtask checkpoint: it
      runs microtasks until the queue is empty, including microtasks that those microtasks queue.
    </li>
    <li>
      <strong>Rendering</strong> happens between tasks when a frame is due, usually in step with the
      display. It runs the <code>requestAnimationFrame</code> callbacks, recalculates styles and
      layout, delivers <code>ResizeObserver</code> notifications, and paints.
    </li>
  </ul>
  <Figure>
    <Diagram {...EVENT_LOOP} />
    {#snippet caption()}One turn of the loop: one task, then every microtask, then rendering if a
      frame is due.{/snippet}
  </Figure>
  <p>
    Two consequences matter for everything below. Nothing on the page updates while a task runs, so
    a long task freezes the page. And a microtask that keeps queuing microtasks never lets the loop
    reach the next task or the next frame, so it freezes the page too. The program below queues one
    of each kind; press the button to see the order this browser runs them in.
  </p>
  <EventLoopDemo />
  <p>
    The synchronous lines run first, because the script that queued everything else is still
    running. The three microtasks run next, in the order they were queued, as soon as that script
    ends. The timer and the animation frame come after, and the standard does not fix which of the
    two comes first: the frame callback waits for the next rendering opportunity, and the timer's
    task waits for its turn among the task queues. In my runs, Chromium logged the animation frame
    first and WebKit logged the timer first.
  </p>
</DocsSection>

<DocsSection title={ASYNC_SECTIONS.await}>
  <p>
    An <code>async</code> function runs synchronously, like any other function, until it reaches its
    first <code>await</code>. There it returns a pending promise to its caller and stops. The
    ECMAScript specification defines <code>await value</code> as turning the value into a promise
    and attaching a reaction to it, and that reaction is a microtask. So the rest of the function
    always runs later, even after <code>await null</code> or <code>await Promise.resolve()</code>,
    whose values are ready at once.
  </p>
  <p>
    Later can mean much later. If the awaited promise waits for the network, any number of tasks run
    in between: clicks, timers, other answers. Every <code>await</code> is a point where the rest of the
    page can change.
  </p>
  <DocsCode label="State read before an await" code={AWAIT_GAP} />
  <p>
    By the time <code>render</code> runs, <code>query</code> may hold something else, and nothing in
    this function notices. <code>asked</code> is still <code>'ha'</code>, because it was copied
    before the wait, but the screen may have moved on.
  </p>
</DocsSection>

<DocsSection title={ASYNC_SECTIONS.race}>
  <p>
    A search field that queries as you type sends a request for each change. The requests start in
    the order you typed, but they finish in whatever order the network, the server or a cache
    delivers them. This is how a search goes wrong:
  </p>
  <StepList>
    <StepItem title="You type “ha”">
      The handler sends request 1 for <code>ha</code>. Many titles start with it, so this one is
      slow.
    </StepItem>
    <StepItem title="You keep typing, to “harbor”">
      The handler sends request 2 for <code>harbor</code>. Request 1 is still in flight.
    </StepItem>
    <StepItem title="Request 2 answers first">
      Its handler resumes after its <code>await</code> and renders Harbor Lights. The screen is right.
    </StepItem>
    <StepItem title="Request 1 answers last">
      Its handler resumes too and renders every title that starts with <code>ha</code> over the
      correct list. The field says <code>harbor</code>, and the list shows the results for
      <code>ha</code>.
    </StepItem>
  </StepList>
  <Figure>
    <Diagram {...STALE_RACE} />
    {#snippet caption()}Time runs down the page. The slow first answer arrives last and wins.{/snippet}
  </Figure>
  <p>
    Nothing threw, so no error appears anywhere. Each handler did its job correctly in isolation;
    the bug is the assumption that the answer in hand is the latest one. That is a stale answer:
    correct for a question nobody is asking any more.
  </p>
</DocsSection>

<DocsSection title={ASYNC_SECTIONS.latest}>
  <p>
    The usual fix is called latest wins: only the answer to the most recent question may change the
    screen. A request id does it with a counter. Each request takes the next number before it waits,
    and after the wait it compares its number with the counter. If another request has started
    since, the answer is dropped.
  </p>
  <DocsCode label="Latest wins with a request id" code={REQUEST_ID} />
  <p>
    The same counter goes by other names. When it counts something larger than a request, such as
    each time a screen opens a different book, it is often called a generation, and every
    asynchronous step started under an old generation drops its result.
  </p>
  <p>
    The other fix stops the earlier request instead of ignoring its answer. An
    <code>AbortController</code> cancels the earlier <code>fetch</code> when a new search starts, which
    also saves the network and the server the rest of the work. The earlier call then rejects, and the
    handler has to distinguish that rejection from a real failure:
  </p>
  <DocsCode label="Latest wins by aborting the earlier request" code={ABORT_EARLIER} />
  <p>
    Try both against the naive version. Make request 1 slower than request 2 and the naive strategy
    shows a stale list; make it faster and all three agree, which is why this bug survives testing
    on a fast connection.
  </p>
  <RaceDemo />
  <p>
    Latest wins is not the only policy. A save form usually needs the first press to win and later
    presses ignored, which is <a href={asyncHref('double')}>the double submit</a> below. A queue that
    runs one operation after another fits writes that must all happen in order. The question to answer
    for each operation is which result the screen should show when two overlap.
  </p>
</DocsSection>

<DocsSection title={ASYNC_SECTIONS.abort}>
  <p>
    <code>AbortController</code> is a small object with one method, <code>abort()</code>, and one
    property, <code>signal</code>. Code that starts work passes the signal to whatever does the
    work; calling <code>abort()</code> marks the signal aborted, sets its <code>reason</code> and
    fires an
    <code>abort</code> event on it. With no argument, the reason is a <code>DOMException</code>
    named <code>AbortError</code>.
  </p>
  <p>What happens next depends on the consumer:</p>
  <ul>
    <li>
      <code>fetch</code> stops the request and rejects with the signal's reason, also while the body is
      still being read.
    </li>
    <li>
      <code>addEventListener</code> accepts a <code>signal</code> option and removes the listener when
      it aborts.
    </li>
    <li>
      <code>setTimeout</code> has no signal parameter, so a cancelable timer needs code that listens
      for the <code>abort</code> event and calls <code>clearTimeout</code>.
    </li>
  </ul>
  <DocsCode label="One signal, three consumers" code={SIGNAL_CONSUMERS} />
  <p>
    Two static helpers build signals. <code>AbortSignal.timeout(ms)</code> returns a signal that
    aborts by itself after that many milliseconds, with a <code>TimeoutError</code> reason instead
    of
    <code>AbortError</code>, so a handler can distinguish a timeout from a cancel.
    <code>AbortSignal.any(signals)</code> returns a signal that aborts when any of the given signals does,
    with the reason of whichever one did. Together they give a request both a cancel button and a deadline:
  </p>
  <DocsCode label="A cancel and a deadline on one request" code={SIGNAL_HELPERS} />
  <p>
    Note what is missing: there is no way to cancel a promise. A promise is a placeholder for a
    result, not a handle on the work that produces it, and nothing in the language reaches from a
    promise back to that work. Aborting works only when the code doing the work listens to the
    signal. For work that does not, the only option is to stop waiting for it, as the request id
    does, and to make sure its late answer can do no harm.
  </p>
</DocsSection>

<DocsSection title={ASYNC_SECTIONS.never}>
  <p>
    A promise can stay pending forever. The usual way to build one is to wrap an event that never
    fires:
  </p>
  <DocsCode label="A promise that waits for an event" code={EVENT_PROMISE} />
  <p>
    If <code>loaded(frame)</code> is called after the frame's <code>load</code> event has already
    fired, the listener waits for an event that will not come again, because an event is not
    replayed for a listener added later. Nothing after the <code>await</code> ever runs. There is no
    rejection, so no
    <code>catch</code> runs, no <code>finally</code> runs and no error reaches the console. A spinner
    shown before the wait stays up for good. The same happens with a worker that dies without replying,
    a database open that waits for another tab, or a library whose promise resolves only at the end of
    a listener that threw.
  </p>
  <p>
    That last case happened in Dokseo: in Safari, foliate-js's <code>load()</code> never settled
    when a response header blocked an EPUB chapter frame, and the reader stayed on its loading
    curtain. The story is told under
    <a href={SECURITY_WEBKIT_FAILURE_HREF}>the Safari frame-ancestors failure</a>.
  </p>
  <p>
    A pending promise is hard to find because it looks like slowness. The defense is to decide, for
    every wait on something outside your control, how long is too long and what happens then.
  </p>
</DocsSection>
