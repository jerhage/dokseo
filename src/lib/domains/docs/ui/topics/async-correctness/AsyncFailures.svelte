<script lang="ts">
  import StepItem from '$lib/components/StepItem.svelte';
  import StepList from '$lib/components/StepList.svelte';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { FINALLY_SPINNER, LIMITED, MISSING_AWAIT, WITH_TIMEOUT } from './async-examples';
  import { ASYNC_SECTIONS, EXPORT_ACTIVATION_HREF, asyncHref } from './async-sections';
  import DoubleSubmitDemo from './DoubleSubmitDemo.svelte';
  import TimeoutDemo from './TimeoutDemo.svelte';
</script>

<DocsSection title={ASYNC_SECTIONS.timeout}>
  <p>
    <code>Promise.race</code> settles the way the first of its promises settles. Racing the work against
    a timer gives the wait a deadline:
  </p>
  <DocsCode label="A deadline with Promise.race" code={WITH_TIMEOUT} />
  <p>
    The race affects only what the caller receives. The loser keeps going: a request that loses to
    the timer still runs and still has its side effects, and a timer that loses to the work still
    fires later unless something clears it. That is why the helper clears the timer in
    <code>finally</code>, whichever side won. The work cannot be cleared the same way, which is the
    point of the last section: a timeout stops the waiting, not the work.
  </p>
  <p>
    One thing a race does get right: it attaches handlers to every promise it is given, so a loser
    that rejects later does not become an unhandled rejection.
  </p>
  <p>
    The demo waits for an event that nothing fires unless you press the button. With no timeout the
    wait never ends. With a plain race it ends after 2 s, but the listener stays attached. With
    clean-up, the listener and the timer are both released when the race settles.
  </p>
  <TimeoutDemo />
  <p>
    When the operation accepts a signal, <code>AbortSignal.timeout</code> is the simpler deadline,
    because the consumer stops the work and removes its own listeners. Choosing the length is a
    trade: too short and a slow but healthy operation is treated as failed, too long and a broken
    one keeps the screen waiting. <a href={asyncHref('deadline')}>The first GPU run</a> below is a case
    where that choice was made on purpose.
  </p>
</DocsSection>

<DocsSection title={ASYNC_SECTIONS.many}>
  <p>
    Four static methods wait on a list of promises. They start nothing: every promise in the list is
    already running when the method is called. They differ in when they settle and what they report.
  </p>
  <Table size="sm" caption="Waiting on several promises">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Method</TableHeaderCell>
        <TableHeaderCell>Fulfills</TableHeaderCell>
        <TableHeaderCell>Rejects</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell><code>Promise.all</code></TableCell>
        <TableCell>With every value, in order, once all fulfill</TableCell>
        <TableCell>With the first rejection, at once</TableCell>
      </TableRow>
      <TableRow>
        <TableCell><code>Promise.allSettled</code></TableCell>
        <TableCell
          >Once all settle, with one <code>{'{ status, value }'}</code> or
          <code>{'{ status, reason }'}</code> per promise</TableCell
        >
        <TableCell>Never</TableCell>
      </TableRow>
      <TableRow>
        <TableCell><code>Promise.any</code></TableCell>
        <TableCell>With the first value</TableCell>
        <TableCell>With an <code>AggregateError</code> once all reject</TableCell>
      </TableRow>
      <TableRow>
        <TableCell><code>Promise.race</code></TableCell>
        <TableCell>If the first to settle fulfills</TableCell>
        <TableCell>If the first to settle rejects</TableCell>
      </TableRow>
    </TableBody>
  </Table>
  <p>
    <code>Promise.all</code> is the right choice when the results are only useful together: if one
    fails, the whole answer is wrong. Its rejection does not stop the others, though. They keep
    running, and their results are thrown away. When each result stands on its own, such as saving
    ten files or waiting for several animations to end,
    <code>Promise.allSettled</code> waits for all of them and reports each outcome.
  </p>
  <p>
    Starting everything at once is not always wise. Five hundred requests started in one loop
    compete for the same connections and memory, and a server may refuse some of them. A concurrency
    limit keeps a fixed number in flight: a few workers share one iterator over the items, so each
    item is taken exactly once, and each worker starts the next item when its current one settles.
  </p>
  <DocsCode label="At most limit operations at a time" code={LIMITED} />
  <p>
    The opposite problem is two callers asking for the same thing at once. Keeping the promise of
    the first call, and handing the same promise to the second, makes them share one operation
    instead of starting two.
  </p>
</DocsSection>

<DocsSection title={ASYNC_SECTIONS.unhandled}>
  <p>
    A promise that rejects with no handler attached is an unhandled rejection. The ECMAScript
    specification leaves tracking them to the host, through a hook that is called when a promise
    rejects without handlers and again if a handler is attached later. In a browser, the HTML
    standard collects them at each microtask checkpoint and then queues a task that fires an
    <code>unhandledrejection</code> event at the global object, a window or a worker, for every one
    still without a handler. The event has a <code>promise</code> and a <code>reason</code> property.
  </p>
  <p>
    The event is cancelable. If no listener calls <code>preventDefault()</code>, the browser may
    report the reason in the console, which in Chromium is the "Uncaught (in promise)" error. If a
    handler is attached after the event fired, a <code>rejectionhandled</code> event follows.
  </p>
  <p>
    So a rejection nobody handles is not silent for a developer with the console open, but it is
    silent for everyone else: the page goes on as if the operation succeeded. A listener for
    <code>unhandledrejection</code> is the last place to catch it, and the right place to turn it into
    something a person can see.
  </p>
</DocsSection>

<DocsSection title={ASYNC_SECTIONS.floating}>
  <p>
    A floating promise is one that nothing awaits, returns or attaches a handler to. The most common
    source is a forgotten <code>await</code>:
  </p>
  <DocsCode label="A try that catches nothing" code={MISSING_AWAIT} />
  <p>
    <code>save(draft)</code> returns a promise at once, so the <code>try</code> block finishes
    before the save does. If the save rejects, the <code>catch</code> has already been passed, and
    the rejection becomes unhandled. The function also resolves before the save finishes, so
    whatever waits for <code>onSave</code> runs too early.
  </p>
  <p>
    Some promises are meant to float: a click handler starts a save and returns, because the browser
    does not wait for event handlers. Writing <code>void</code> in front of the call says so on
    purpose, and the failure still needs somewhere to go: a <code>catch</code> that handles it, or a
    global <code>unhandledrejection</code> listener that reports it.
  </p>
</DocsSection>

<DocsSection title={ASYNC_SECTIONS.double}>
  <p>A save button and a slow save make a race of their own:</p>
  <StepList>
    <StepItem title="You tap Save">The handler starts the save and waits for the database.</StepItem
    >
    <StepItem title="Nothing seems to happen">
      The save is still running and the button looks the same, so you tap again.
    </StepItem>
    <StepItem title="The handler runs a second time">
      Nothing in it checks for the first save, so it starts another one.
    </StepItem>
    <StepItem title="Both saves finish">
      The record is written twice, or a second payment is taken, or a second copy of a file is
      imported.
    </StepItem>
  </StepList>
  <p>There are two ways to stop the second save, and they protect different things:</p>
  <ul>
    <li>
      <strong>Disable the button</strong> while the save runs. This also shows that something is happening.
      But it protects only that button: a keyboard shortcut, a second button for the same action, or code
      that calls the handler directly all get through.
    </li>
    <li>
      <strong>Ignore the call in the handler</strong>: check a busy state at the top and return.
      This covers every path that reaches the handler. The busy state has to be set before the first
      <code>await</code>, because the second call can arrive at that <code>await</code>.
    </li>
  </ul>
  <p>
    A framework adds a timing detail. Svelte applies a state change to the DOM in a microtask, so a
    disabled button is in place before the browser's next task, and two separate taps are two tasks.
    Two calls inside one task arrive before that update: the second button in the demo clicks Save
    twice in one task to show it.
  </p>
  <DoubleSubmitDemo />
  <p>
    Doing both is common: the disabled button shows that the save is running, and the check in the
    handler guarantees one save.
  </p>
</DocsSection>

<DocsSection title={ASYNC_SECTIONS.finally}>
  <p>
    Cleanup that must happen whatever the outcome belongs in <code>finally</code>. It runs after the
    <code>try</code> block returns or throws, and after an awaited promise in it fulfills or rejects:
  </p>
  <DocsCode label="The spinner goes away on every outcome" code={FINALLY_SPINNER} />
  <p>Three details are easy to miss:</p>
  <ul>
    <li>
      <code>finally</code> runs when the wait ends. If the awaited promise never settles, it never
      runs, so <a href={asyncHref('never')}>a promise that never settles</a> leaves the spinner up
      even with <code>finally</code>.
    </li>
    <li>
      A <code>return</code> or a <code>throw</code> inside <code>finally</code> replaces the outcome
      of the <code>try</code>. So does an awaited promise in it that rejects: its error replaces the
      error that was on its way out.
    </li>
    <li>
      <code>Promise.prototype.finally</code> passes the original value or rejection through unchanged,
      unless its callback throws or returns a promise that rejects.
    </li>
  </ul>
</DocsSection>

<DocsSection title={ASYNC_SECTIONS.activation}>
  <p>
    Some browser features open only in response to a person's action: a popup window, the share
    sheet, full screen. The HTML standard tracks this as transient activation. A click or a key
    press starts it, and it expires after a duration the browser chooses, which the standard says
    should be at most a few seconds. Some features also consume it, so it cannot be used twice.
  </p>
  <p>
    An <code>await</code> between the click and the gated call spends that time. A handler that
    reads a database, builds a file and then calls <code>navigator.share()</code> can find the
    activation gone, and the call rejects with <code>NotAllowedError</code>. Nothing is wrong with
    the code except the order. The fix is to do the slow work before the click, so the handler calls
    the gated feature with no <code>await</code> in front of it. The details, and a demo that
    measures this browser, are under
    <a href={EXPORT_ACTIVATION_HREF}>user activation, and why an await can cost it</a>.
  </p>
</DocsSection>
