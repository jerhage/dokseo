<script lang="ts">
  import Badge from '$lib/ui/components/Badge.svelte';
  import Diagram from '$lib/ui/components/Diagram.svelte';
  import Figure from '$lib/ui/components/Figure.svelte';
  import { onnxDefaultThreads } from '../../../domain/security-headers';
  import DocsCode from '../../DocsCode.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { DOKSEO_WORKERS } from './workers-diagrams';
  import {
    OCR_CROP_HREF,
    OCR_RUNTIME_HREF,
    OCR_WORKER_HREF,
    OFFLINE_WORKER_HREF,
    RENDERING_OWNERSHIP_HREF,
    RENDERING_PDF_HREF,
    SECURITY_ISOLATION_HREF,
    STORAGE_WRITER_HREF,
    WORKERS_SECTIONS,
    workersHref,
  } from './workers-sections';
  import {
    OCR_FAILED_REPLY,
    OCR_REQUEST,
    OCR_WORKER_LISTENER,
    RECOGNIZER_LISTENERS,
    RECOGNIZER_SEND,
    START_OCR_WORKER,
    WORKER_CLOSES_CROP,
    WORKER_SCOPE,
    WRITER_POST,
    WRITER_QUEUE,
  } from './workers-snippets';

  const threads = onnxDefaultThreads(crossOriginIsolated, navigator.hardwareConcurrency);
</script>

<DocsSection title={WORKERS_SECTIONS.map}>
  <p>
    Dokseo starts dedicated workers for three jobs. None of them starts when the app loads; each
    starts when its job first comes up:
  </p>
  <ul>
    <li>
      An OCR worker runs the recognition model. It is <code>src/workers/ocr.worker.ts</code> for
      manga-ocr or <code>src/workers/paddle-ocr.worker.ts</code> for PaddleOCR, depending on the chosen
      model, and both speak the same protocol.
    </li>
    <li>
      The OPFS writer, <code>src/workers/opfs-writer.worker.ts</code>, writes book files into the
      origin private file system.
    </li>
    <li>
      pdf.js starts a worker of its own for parsing a PDF, from the URL Dokseo sets in
      <code>GlobalWorkerOptions.workerSrc</code>;
      <a href={RENDERING_PDF_HREF}>Rendering a PDF with pdf.js</a> covers it. Its messages are pdf.js's
      own business.
    </li>
  </ul>
  <p>
    Inside the OCR worker, ONNX Runtime may start threads of its own. The service worker is the
    fourth kind of background script, covered in <a href={OFFLINE_WORKER_HREF}
      >Offline and the PWA</a
    >. None of them touches the DOM.
  </p>
  <Figure>
    <Diagram {...DOKSEO_WORKERS} />
    {#snippet caption()}The dedicated workers Dokseo's page starts.{/snippet}
  </Figure>
</DocsSection>

<DocsSection title={WORKERS_SECTIONS.ocr}>
  <p>
    The recognizer adapter starts its worker with the inline pattern Vite looks for, through the
    <code>$workers</code> alias:
  </p>
  <DocsCode label={START_OCR_WORKER.label} code={START_OCR_WORKER.code} />
  <p>
    Every file in the project is compiled against the DOM type library, where <code>self</code> is a
    <code>Window</code>. A worker's real global has a different <code>postMessage</code>, so each
    worker file declares the two members it uses and converts <code>self</code> once, in one named
    function. It is the one kind of <code>as</code> cast the project allows: a library boundary whose
    types are wrong, kept in the file that owns it.
  </p>
  <DocsCode label={WORKER_SCOPE.label} code={WORKER_SCOPE.code} />
  <p>
    The protocol lives in <code>src/workers/ocr-worker-protocol.ts</code>, imported by the adapter
    and by both worker files. The page sends two kinds of request, each with an id:
  </p>
  <DocsCode label={OCR_REQUEST.label} code={OCR_REQUEST.code} />
  <p>
    The worker replies <code>opened</code> or <code>recognized</code> on success and
    <code>failed</code>
    on failure, all with the request's id. A fourth reply, <code>progress</code>, has no id, because
    it reports the model download to whoever is listening rather than answering one request.
  </p>
  <DocsCode label={OCR_FAILED_REPLY.label} code={OCR_FAILED_REPLY.code} />
  <p>
    On the worker side, the message listener starts an async function per request and does not await
    it; <code>void</code> marks that as deliberate. Each of those functions catches its own failures
    and posts <code>failed</code> with the id, because a rejection would never reach the page (<a
      href={workersHref('lifetime')}>Errors, lifetime and termination</a
    >).
  </p>
  <DocsCode label={OCR_WORKER_LISTENER.label} code={OCR_WORKER_LISTENER.code} />
  <p>
    On the page side, <code>worker-recognizer.ts</code> keeps a <code>pending</code> map from id to
    the function that settles a recognition, and matches each reply kind with an exhaustive
    <code>match</code>. A worker-level failure, an <code>error</code> or a
    <code>messageerror</code>, goes to <code>discard</code>, which settles the opening as
    unavailable, fails every pending recognition with the cause, and terminates the worker. The next
    capture starts a fresh one.
  </p>
  <DocsCode label={RECOGNIZER_LISTENERS.label} code={RECOGNIZER_LISTENERS.code} />
  <p>
    The <a href={OCR_WORKER_HREF}>OCR page</a> follows the same worker from the model's side: when it
    starts, how long it lives and what it loads.
  </p>
</DocsSection>

<DocsSection title={WORKERS_SECTIONS.crop}>
  <p>
    A crop is an <code>ImageBitmap</code>, and it goes to the worker in the transfer list, so its
    pixels are not copied. A transfer detaches the sender's bitmap, so the adapter never sends the
    bitmap it was given. <code>preparedFor</code> first draws the caller's crop into a new bitmap, capped
    in size and converted to gray when the model needs that, and the new one is sent:
  </p>
  <DocsCode label={RECOGNIZER_SEND.label} code={RECOGNIZER_SEND.code} />
  <p>
    <code>prepared</code> is an <code>OwnedBitmap</code>: <code>using</code> closes it when the
    block ends, unless <code>release()</code> was called first. Calling <code>release()</code> right after
    the transfer records that ownership moved to the worker, and the caller's own crop comes back untouched.
    The worker then owns the bitmap it received, and closes it when it is done, whatever the outcome:
  </p>
  <DocsCode label={WORKER_CLOSES_CROP.label} code={WORKER_CLOSES_CROP.code} />
  <p>
    The reader's pages follow the same rule of one owner and one release. A page picture belongs to
    the frame that requested it and is released through <code>releasePicture</code>, which revokes
    an object URL or closes a bitmap, and a drawn page enters its canvas by another transfer,
    <code>transferFromImageBitmap</code>. <a href={RENDERING_OWNERSHIP_HREF}>Who owns a bitmap</a>
    follows that path, and <a href={OCR_CROP_HREF}>The crop</a> follows a crop from the selection.
  </p>
</DocsSection>

<DocsSection title={WORKERS_SECTIONS.writer}>
  <p>
    The writer exists because the file API that works in every engine,
    <code>createSyncAccessHandle()</code>, works only in a dedicated worker;
    <a href={STORAGE_WRITER_HREF}>Book files and the writer worker</a> describes that failure. The
    page posts the book's <code>Blob</code> with an empty transfer list, inside a <code>try</code>,
    so a
    <code>DataCloneError</code> removes the pending entry instead of leaving a request that never settles:
  </p>
  <DocsCode label={WRITER_POST.label} code={WRITER_POST.code} />
  <p>
    Messages arrive in order, but an async handler returns at its first <code>await</code>, and the
    next message can start before the previous write has finished. A sync access handle holds an
    exclusive lock on its file until it is closed, so the writer chains each write onto the last and
    runs one at a time:
  </p>
  <DocsCode label={WRITER_QUEUE.label} code={WRITER_QUEUE.code} />
  <p>
    The replies follow the same pattern as the OCR protocol, each with the write's id:
    <code>written</code> after each chunk, which drives the upload's progress bar, then
    <code>done</code>
    or <code>failed</code>. The page keeps one writer for the session and discards it on
    <code>error</code>
    or <code>messageerror</code>, rejecting every pending write.
  </p>
</DocsSection>

<DocsSection title={WORKERS_SECTIONS.threads}>
  <p>
    The OCR models run in ONNX Runtime Web, loaded by transformers.js inside the OCR worker (<a
      href={OCR_RUNTIME_HREF}>transformers.js and ONNX Runtime Web</a
    >). Dokseo does not set its thread count, so the runtime's default applies. In the installed
    version, onnxruntime-web 1.31.0-dev,
    <code>lib/backend-wasm.ts</code> sets
    <code>numThreads</code> to 1 when <code>crossOriginIsolated</code> is false, and otherwise to
    half the reported cores, rounded up, at most 4. Before it starts, it checks that
    <code>SharedArrayBuffer</code> exists and that WebAssembly threads validate, and drops to one thread
    with a console warning if they do not.
  </p>
  <p>
    The runtime is compiled with Emscripten, and with <em>n</em> threads it starts <em>n</em> - 1
    more workers that share one WebAssembly memory with the thread that loaded it. transformers.js
    sets the runtime's <code>proxy</code> option to false, so that thread is the OCR worker itself, and
    the extra workers are started from inside it. A worker starting workers is a nested worker, which
    Safari has supported since 15.5 according to MDN's compatibility data. On a GPU the matrix work moves
    to WebGPU instead, as the OCR page describes.
  </p>
  <DocsDemo label="This browser">
    <p class="row wrap items-center gap-2 m-0">
      ONNX Runtime's default thread count here
      <Badge variant="primary">{threads}</Badge>
      so it would start
      <Badge>{Math.max(0, threads - 1)}</Badge>
      more workers.
    </p>
    {#snippet caption()}
      Read from <code>crossOriginIsolated</code> and <code>navigator.hardwareConcurrency</code>;
      <a href={SECURITY_ISOLATION_HREF}>Cross-origin isolation</a> shows both.
    {/snippet}
  </DocsDemo>
</DocsSection>

<DocsSection title={WORKERS_SECTIONS.build}>
  <p>
    <code>vite.config.ts</code> maps the alias <code>$workers</code> to <code>src/workers</code>.
    Vite resolves the alias inside the <code>new URL</code> call, bundles each worker file as an entry
    of its own, and writes it to the build with a hashed name. A dependency imported only by a worker,
    such as transformers.js, is bundled with that worker and stays out of the page's code.
  </p>
  <p>The alias is there because of a failure that only a build could see:</p>
  <ul>
    <li>
      The manga-ocr adapter moved one folder deeper. Its relative path to the worker file now
      resolved to a folder that did not exist.
    </li>
    <li>
      Type checking, linting, the dependency rules and the unit tests all passed. To all of them the
      path is a string inside <code>new URL</code>, and the adapter's tests pass in a stand-in
      <code>startWorker</code>, so no test runs the real one.
    </li>
    <li>
      <code>vite build</code> failed with <code>UNRESOLVED_ENTRY</code>, naming the worker file it
      could not find.
    </li>
  </ul>
  <p>
    With an alias, moving the file that starts a worker cannot change the path. The build also ends
    Dokseo's full verify task, because it is the only step that resolves these URLs.
  </p>
</DocsSection>

<DocsSection title={WORKERS_SECTIONS.rule}>
  <ul>
    <li>
      Move work that takes longer than a frame off the main thread, and keep everything visible on
      the page.
    </li>
    <li>
      Give each worker one protocol module that both sides import: requests and replies
      discriminated on
      <code>kind</code>, an id on every request, and a failure reply.
    </li>
    <li>
      Catch inside every async handler in a worker and post the failure with its id; a rejection
      never reaches the page.
    </li>
    <li>
      Treat <code>error</code> and <code>messageerror</code> as the end of the worker: settle every pending
      request, terminate it, and start a new one on the next request.
    </li>
    <li>
      Post plain data. Snapshot reactive state first, and wrap <code>postMessage</code> in a
      <code>try</code> when the value comes from elsewhere.
    </li>
    <li>
      Transfer only what you own and will not read again, and record the change of ownership at the
      transfer.
    </li>
    <li>
      Write <code>new Worker(new URL(…, import.meta.url))</code> inline, with an alias for the path.
    </li>
    <li>
      Share memory only in a cross-origin isolated page, use <code>Atomics</code> for every shared cell,
      and never block the main thread.
    </li>
  </ul>
</DocsSection>
