<script lang="ts">
  import StepItem from '$lib/ui/components/StepItem.svelte';
  import StepList from '$lib/ui/components/StepList.svelte';
  import { ROOT_WORKER_SOURCE } from '../../../domain/demo-protocol';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { COUNTER_WORKER_SOURCE } from './demo-workers';
  import ProtocolDemo from './ProtocolDemo.svelte';
  import SharedCounterDemo from './SharedCounterDemo.svelte';
  import { SECURITY_ISOLATION_HREF, WORKERS_SECTIONS, workersHref } from './workers-sections';

  const PENDING_EXAMPLE = `const pending = new Map<number, (reply: Reply) => void>();
let lastId = 0;

worker.addEventListener('message', (event: MessageEvent<Reply>) => {
  const settle = pending.get(event.data.id);
  pending.delete(event.data.id);
  settle?.(event.data);
});

function ask(value: number): Promise<Reply> {
  lastId += 1;
  const id = lastId;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    worker.postMessage({ kind: 'root', id, value });
  });
}`;
</script>

<DocsSection title={WORKERS_SECTIONS.shared}>
  <p>
    A <code>SharedArrayBuffer</code> is the one exception to copying. Posting it neither copies nor
    moves it: the receiver gets a new <code>SharedArrayBuffer</code> object over the same memory, and
    a write on one thread can be read on the other with no message at all.
  </p>
  <p>
    Shared memory brings back the problem that message passing avoids. <code>cells[0] += 1</code> is
    three steps: read the value, add one, write it back. Two threads running it at once can both
    read 5 and both write 6, and one increment is lost. The <code>Atomics</code> object runs such steps
    as one indivisible operation on an integer typed array over shared memory:
  </p>
  <ul>
    <li>
      <code>Atomics.add(cells, i, n)</code> adds <em>n</em> to cell <em>i</em> and returns the value
      from before the addition; <code>sub</code>, <code>and</code>, <code>or</code>,
      <code>xor</code>,
      <code>exchange</code> and <code>compareExchange</code> work the same way.
    </li>
    <li>
      <code>Atomics.load</code> and <code>Atomics.store</code> read and write one cell, ordered with respect
      to the other atomic operations.
    </li>
    <li>
      <code>Atomics.wait(cells, i, expected, timeout)</code> puts the calling thread to sleep while
      cell
      <em>i</em> still holds <em>expected</em>. It returns <code>"not-equal"</code> at once if the
      cell holds something else, <code>"ok"</code> when another thread wakes it, and
      <code>"timed-out"</code> after the timeout. <code>Atomics.notify(cells, i, count)</code> wakes
      up to
      <em>count</em> waiting threads and returns how many it woke.
    </li>
  </ul>
  <p>
    A page's main thread may not sleep. The ECMAScript standard makes <code>Atomics.wait</code>
    throw a
    <code>TypeError</code> when the calling agent cannot suspend, and the HTML standard lets only
    dedicated and shared worker agents block. <code>Atomics.waitAsync</code> returns a promise instead
    of sleeping, so the standard allows it on a page.
  </p>
  <p>
    All of this exists only in a cross-origin isolated page. Without the two isolation headers,
    <code>SharedArrayBuffer</code> is not defined in Chromium or WebKit, and the HTML standard makes
    serializing one throw a <code>DataCloneError</code>.
    <a href={SECURITY_ISOLATION_HREF}>Cross-origin isolation</a> explains why: shared memory can be turned
    into a precise timer, and Spectre-style attacks need one.
  </p>
  <DocsCode label="The counting workers' script" code={COUNTER_WORKER_SOURCE} />
  <SharedCounterDemo />
  <p>
    The plain increment usually ends well short of the expected total, and the exact shortfall
    changes from run to run. The <code>Atomics.add</code> run always reaches it, and in my runs it
    also took several times longer: every addition is an indivisible read, add and write on a cell
    that the other worker is writing too. WebAssembly threads are built on the same pieces: one
    <code>WebAssembly.Memory</code>
    created with
    <code>shared: true</code>, posted to several workers, with atomic instructions for locks.
    <a href={workersHref('threads')}>ONNX Runtime threads</a> shows where Dokseo depends on that.
  </p>
</DocsSection>

<DocsSection title={WORKERS_SECTIONS.protocol}>
  <p>
    A message is an event, not a call. Nothing in <code>postMessage</code> says which reply belongs to
    which request, and a worker that does asynchronous work can reply in any order. Calling a worker the
    way a function is called takes a small protocol, written once and used on both sides:
  </p>
  <StepList>
    <StepItem title="A type per message">
      <p>
        Requests and replies are discriminated unions on a <code>kind</code> field, declared in one module
        that the page and the worker both import. The compiler then checks both ends against the same
        definitions.
      </p>
    </StepItem>
    <StepItem title="An id per request">
      <p>
        The page numbers each request, and the worker copies the number into its reply. The page
        keeps a map from id to the function that settles that request's promise.
      </p>
    </StepItem>
    <StepItem title="A failure reply">
      <p>
        When the work fails, the worker replies with the same id and a failure, so the request
        settles either way and the page can show why.
      </p>
    </StepItem>
    <StepItem title="A plan for a dead worker">
      <p>
        If the worker itself fails, no reply will come for anything still in the map. The page
        settles every one of them with an error and starts a new worker next time.
      </p>
    </StepItem>
  </StepList>
  <DocsCode label="The page side of a request and reply protocol" code={PENDING_EXAMPLE} />
  <p>
    The demo's worker waits for each request's delay before it replies, so four requests sent in
    order come back in a different one. Its whole script:
  </p>
  <DocsCode label="The square root worker" code={ROOT_WORKER_SOURCE} />
  <ProtocolDemo />
</DocsSection>

<DocsSection title={WORKERS_SECTIONS.lifetime}>
  <p>
    A worker keeps running until something ends it. Four things reach the page when it goes wrong,
    and each needs its own handling.
  </p>
  <StepList>
    <StepItem title="An exception thrown out of a handler">
      <p>
        The error goes first to the worker's own <code>error</code> event, and if no handler there
        cancels it, to the <code>error</code> event of the <code>Worker</code> object in the page. The
        worker keeps running and handles the next message.
      </p>
    </StepItem>
    <StepItem title="A rejected promise in an async handler">
      <p>
        Nothing reaches the page. The rejection fires <code>unhandledrejection</code> inside the
        worker, and in Chromium and WebKit the page's <code>error</code> event stays silent. A request
        whose handler rejected waits forever, which is why every async handler catches and posts a failure
        reply.
      </p>
    </StepItem>
    <StepItem title="A message that cannot be deserialized">
      <p>The receiver gets <code>messageerror</code> instead of <code>message</code>.</p>
    </StepItem>
    <StepItem title="A script that does not load">
      <p>
        A missing file, a wrong MIME type or a response blocked by the page's embedder policy fires
        <code>error</code> on the <code>Worker</code> object, and the worker never runs.
      </p>
    </StepItem>
  </StepList>
  <p>
    <code>worker.terminate()</code> ends a worker at once, in the middle of whatever it was running,
    and a worker can end itself with <code>self.close()</code>. A dedicated worker also ends with
    the page that owns it. After termination no reply arrives for anything still pending, so the
    page settles those requests itself, as the demo's <code>terminate()</code> button shows.
  </p>
  <p>
    Starting a worker costs a thread and the time to fetch and run its script, and a worker that
    loads a model holds that model in memory. So a worker for repeated work is started once, when it
    is first needed, and kept until the work is over.
  </p>
</DocsSection>
