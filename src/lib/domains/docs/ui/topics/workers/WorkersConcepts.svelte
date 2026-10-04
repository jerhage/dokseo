<script lang="ts">
  import Diagram from '$lib/components/Diagram.svelte';
  import Figure from '$lib/components/Figure.svelte';
  import StepItem from '$lib/components/StepItem.svelte';
  import StepList from '$lib/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { PRIMES_WORKER_SOURCE } from './demo-workers';
  import JankDemo from './JankDemo.svelte';
  import PostTesterDemo from './PostTesterDemo.svelte';
  import TransferDemo from './TransferDemo.svelte';
  import { CLONE_OR_TRANSFER, MESSAGE_CHANNEL } from './workers-diagrams';
  import {
    EXPORT_PROXY_HREF,
    OFFLINE_WORKER_HREF,
    RENDERING_OFFSCREEN_HREF,
    SECURITY_WORKERS_HREF,
    STORAGE_OPFS_HREF,
    STORAGE_WRITER_HREF,
    WORKERS_SECTIONS,
    workersHref,
  } from './workers-sections';

  const START_EXAMPLE = `const worker = new Worker(new URL('./count.worker.ts', import.meta.url), {
  type: 'module',
});
worker.addEventListener('message', (event) => {
  console.log(event.data);
});
worker.postMessage({ below: 1_000_000 });`;

  const TRANSFER_EXAMPLE = `const pixels = new Uint8Array(64 * 1024 * 1024);
worker.postMessage(pixels, [pixels.buffer]);
pixels.byteLength;`;
</script>

<DocsSection title={WORKERS_SECTIONS.mainThread}>
  <p>
    A page runs its JavaScript on one thread, the <em>main thread</em>. The same thread runs the
    page's
    <em>event loop</em>: it takes one task from a queue, such as a click handler, a timer or an
    arriving message, runs it to the end, and between tasks it may update the rendering. Updating
    the rendering means running the <code>requestAnimationFrame</code> callbacks, working out styles and
    layout, and painting. A 60 Hz display shows a new frame about every 16.7 ms, so that is roughly how
    long a task can run before a frame is missed.
  </p>
  <p>
    While a task runs, nothing else on that thread does. A function that loops for one second holds
    the thread for one second: no frame is painted, a tap waits in the queue, and anything animated
    from script stands still. The W3C Long Tasks specification reports any task of 50 ms or more as
    a long task.
  </p>
  <p>
    The demo runs one loop, counting primes by trial division, in two places. The dot is moved by a
    <code>requestAnimationFrame</code> callback, so it moves only when the main thread is free to run
    one.
  </p>
  <JankDemo />
  <p>
    The count takes about as long in the worker as on the page. What changes is which thread waits.
    A <em>worker</em> is a second thread with its own global object and its own event loop, so the page
    keeps painting frames while the worker counts, and the longest gap between frames stays near one frame.
  </p>
</DocsSection>

<DocsSection title={WORKERS_SECTIONS.kinds}>
  <p>The web platform has three kinds of worker, and they differ in who can talk to them.</p>
  <StepList>
    <StepItem title="Dedicated worker">
      <p>
        <code>new Worker(url)</code> starts one for the script that created it, and only that script can
        message it. When the page goes away, so does the worker. Everything else on this page is about
        this kind.
      </p>
    </StepItem>
    <StepItem title="Shared worker">
      <p>
        <code>new SharedWorker(url)</code> connects to one worker shared by every page of the origin
        that names the same script. Each page talks to it through a <code>MessagePort</code>,
        <code>worker.port</code>. According to MDN's compatibility data, Safari has supported shared
        workers again since version 16, and Chrome on Android only since version 148.
      </p>
    </StepItem>
    <StepItem title="Service worker">
      <p>
        A script registered for an origin that sits between its pages and the network. The browser
        starts and stops it on its own schedule, and it outlives the pages. Dokseo uses one to work
        offline, which <a href={OFFLINE_WORKER_HREF}>Offline and the PWA</a> explains.
      </p>
    </StepItem>
  </StepList>
</DocsSection>

<DocsSection title={WORKERS_SECTIONS.starting}>
  <p>
    A worker runs a script from a URL. With <code>{'{'} type: 'module' {'}'}</code> the script is
    loaded as an ES module, so it can use <code>import</code>. Without it the worker is
    <em>classic</em>, and loads other scripts with <code>importScripts()</code>. Module workers
    arrived in Chrome 80, Safari 15 and Firefox 114.
  </p>
  <DocsCode label="Starting a module worker and talking to it" code={START_EXAMPLE} />
  <p>
    <code>import.meta.url</code> is the URL of the module that contains the line, so
    <code>new URL('./count.worker.ts', import.meta.url)</code> resolves the worker's file next to
    it. A browser cannot run a TypeScript file, though, and in a build the file moves and gets a
    hashed name. Vite handles that by looking for exactly this pattern in the source: a
    <code>new Worker(new URL('…', import.meta.url))</code> written inline, with static options. In
    the dev server it serves the file as a module. In a build it bundles the worker file and its
    imports as a separate entry and replaces the URL with the output file's URL. Hoisting the
    <code>new URL</code> into a variable hides the pattern, and the worker is no longer built.
  </p>
  <p>
    A worker can also start from text. Put the source in a <code>Blob</code>, make a URL for it with
    <code>URL.createObjectURL</code>, and pass that URL to <code>new Worker</code>. Every demo on
    this page starts its worker that way, so its whole script can be shown. This is the jank demo's
    worker: the counting function's own source text, followed by a message handler.
  </p>
  <DocsCode label="The jank demo's worker, as this page builds it" code={PRIMES_WORKER_SOURCE} />
  <p>
    A worker from a <code>blob:</code> URL copies the page's content security policy, while a worker
    from its own file takes the policy of that file's response;
    <a href={SECURITY_WORKERS_HREF}>Workers have their own policy</a> runs both.
  </p>
</DocsSection>

<DocsSection title={WORKERS_SECTIONS.scope}>
  <p>
    Inside a dedicated worker the global object is a <code>DedicatedWorkerGlobalScope</code>,
    reached as
    <code>self</code>. It has no <code>window</code> and no <code>document</code>, so no element, no
    layout and no event from the page reaches the worker. <code>localStorage</code> is missing too, because
    Web Storage is exposed only to windows.
  </p>
  <p>
    A worker keeps most of the rest: <code>fetch</code>, timers, IndexedDB, the Cache API,
    <code>createImageBitmap</code>, <code>OffscreenCanvas</code>
    (<a href={RENDERING_OFFSCREEN_HREF}>OffscreenCanvas and workers</a>), WebAssembly and WebGPU.
    Some APIs exist only there. A synchronous access handle to a file in the origin private file
    system blocks while it writes, so it is offered only in dedicated workers, as
    <a href={STORAGE_OPFS_HREF}>The origin private file system</a> describes.
  </p>
  <p>
    So the split is fixed: the page owns everything visible, and the worker computes and replies.
    Whatever the worker produces reaches the screen as a message that the page's code turns into DOM
    changes.
  </p>
  <Figure>
    <Diagram {...MESSAGE_CHANNEL} />
    {#snippet caption()}
      Two threads, two event loops, and copies of messages between them.
    {/snippet}
  </Figure>
</DocsSection>

<DocsSection title={WORKERS_SECTIONS.clone}>
  <p>
    <code>postMessage(message)</code> does not pass a reference. The HTML standard serializes the
    value with its <em>structured serialize</em> algorithm, and the receiving side deserializes a new
    value in its own realm. The two threads never hold the same object, so neither can change the other's.
  </p>
  <p>
    The algorithm copies primitives (except symbols), plain objects and arrays, <code>Date</code>,
    <code>RegExp</code>, <code>Map</code> and <code>Set</code>, <code>ArrayBuffer</code> and typed
    arrays,
    <code>Blob</code> and <code>File</code>, <code>ImageBitmap</code> and errors. It keeps cycles and
    shared references inside the message. It does not keep everything about an object:
  </p>
  <ul>
    <li>
      Only own enumerable properties are copied, and the copy is a plain object. A class instance
      arrives without its prototype, so its methods are gone.
    </li>
    <li>A getter is called during the copy, and the copy holds its value as a plain property.</li>
    <li>
      An error keeps its name only if it is <code>Error</code>, <code>EvalError</code>,
      <code>RangeError</code>, <code>ReferenceError</code>, <code>SyntaxError</code>,
      <code>TypeError</code> or <code>URIError</code>; any other name becomes <code>Error</code>.
    </li>
  </ul>
  <p>
    Some values cannot be serialized at all, and the sender's <code>postMessage</code> throws a
    <code>DataCloneError</code> before anything is sent: a symbol, a function (and so any object
    with a method), a platform object that is not serializable, such as a DOM element, and an exotic
    object, which includes every <code>Proxy</code>. A <code>WeakMap</code> throws as well. Because
    the throw is synchronous, a <code>try</code> around <code>postMessage</code> catches it.
  </p>
  <PostTesterDemo />
  <p>
    The proxy row is the one that reaches Svelte code. A deep <code>$state</code> wraps objects in
    proxies, so posting one, or storing one in IndexedDB, which copies with the same algorithm,
    throws.
    <a href={EXPORT_PROXY_HREF}>A proxy IndexedDB could not clone</a> describes how that failed in
    Dokseo and the two fixes, <code>$state.raw</code> and <code>$state.snapshot</code>.
  </p>
  <p>
    The receiver can fail too. If a message serializes on one side but cannot be deserialized on the
    other, the receiver gets a <code>messageerror</code> event instead of a <code>message</code>.
  </p>
</DocsSection>

<DocsSection title={WORKERS_SECTIONS.transfer}>
  <p>
    A copy costs time and memory in proportion to its size, and the serialization runs inside the
    sender's <code>postMessage</code> call. Posting a 64 MB buffer copies 64 MB on the page's thread,
    and for a moment both copies exist.
  </p>
  <p>
    The second argument to <code>postMessage</code> is a <em>transfer list</em>. Each object in it
    is moved instead of copied: the receiver gets an object over the same underlying memory, and the
    sender's object is <em>detached</em>. A detached <code>ArrayBuffer</code> has a
    <code>byteLength</code> of 0, and making a view over it or slicing it throws a
    <code>TypeError</code>. A detached
    <code>ImageBitmap</code> has a width and height of 0. A typed array is not transferable itself;
    its
    <code>.buffer</code> is:
  </p>
  <DocsCode
    label="Transferring a typed array's buffer; the last line reads 0"
    code={TRANSFER_EXAMPLE}
  />
  <Figure>
    <Diagram {...CLONE_OR_TRANSFER} />
    {#snippet caption()}A clone copies the bytes; a transfer moves them and leaves the sender empty.{/snippet}
  </Figure>
  <TransferDemo />
  <p>
    The clone's <code>postMessage</code> call grows with the buffer, and the transfer's stays close to
    zero at any size. The other column shows the price: after a transfer the page's buffer is empty.
  </p>
  <p>
    MDN lists the transferable types. The ones a page meets most are <code>ArrayBuffer</code>,
    <code>ImageBitmap</code>, <code>OffscreenCanvas</code>, <code>MessagePort</code> and the stream
    types (<code>ReadableStream</code>, <code>WritableStream</code>, <code>TransformStream</code>).
    A
    <code>MessagePort</code> comes from <code>new MessageChannel()</code>, which makes two connected
    ports; transferring one to a worker gives the page and the worker a private line of their own. A
    <code>Blob</code> is not transferable, and does not need to be: it is an immutable reference to
    bytes, and cloning it does not read those bytes into memory. That is why
    <a href={STORAGE_WRITER_HREF}>Dokseo's writer worker</a> receives whole book files as
    <code>Blob</code>s.
  </p>
  <p>
    The transfer list has rules of its own, and each broken rule is a <code>DataCloneError</code>:
    the same object listed twice, an <code>ArrayBuffer</code> that is already detached, and a
    <code>SharedArrayBuffer</code>, which the <a href={workersHref('shared')}>next section</a> covers.
  </p>
</DocsSection>
