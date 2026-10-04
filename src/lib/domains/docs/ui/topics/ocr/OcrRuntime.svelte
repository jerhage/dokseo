<script lang="ts">
  import StepItem from '$lib/components/StepItem.svelte';
  import StepList from '$lib/components/StepList.svelte';
  import { MAX_DEFAULT_WASM_THREADS } from '../../../domain/ocr-compute';
  import {
    JAPANESE_OCR_MODEL,
    downloadMb,
    onDiskMb,
    runtimeMb,
    weightsMb,
  } from '$lib/domains/recognition/domain/model/model-footprint';
  import { FIRST_GPU_RUN_DEADLINE_MS } from '$workers/device-fallback';
  import { RECORDED_BUBBLE_RUN } from '../../../domain/ocr-recorded-run';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import ComputeCheck from './ComputeCheck.svelte';
  import { OCR_SECTIONS } from './ocr-sections';
  import { DICTIONARY_CACHE_FIRST, WORKER_REQUESTS } from './ocr-snippets';

  const model = JAPANESE_OCR_MODEL;
  const deadlineSeconds = FIRST_GPU_RUN_DEADLINE_MS / 1000;
</script>

<DocsSection title={OCR_SECTIONS.runtime}>
  <p>
    Two libraries run the model. <strong>transformers.js</strong>, the npm package
    <code>@huggingface/transformers</code>, fetches a model's files from the Hugging Face Hub, reads
    its configuration, and provides the image processor and the tokenizer.
    <strong>ONNX Runtime Web</strong>, <code>onnxruntime-web</code>, executes the model graphs,
    which are stored in the ONNX format. transformers.js creates one ONNX Runtime inference session
    per graph: two for manga-ocr, the encoder and the decoder, and one for PaddleOCR.
  </p>
  <p>
    ONNX Runtime itself is a WebAssembly binary, and it is not part of Dokseo's bundle.
    transformers.js points it at <code>cdn.jsdelivr.net</code>, at the
    <code>onnxruntime-web</code> version it was built against, so the first load fetches about
    {runtimeMb(model)} MB of compressed runtime that unpacks to {onDiskMb(model) - weightsMb(model)}
    MB. The PaddleOCR models are bare graphs with no transformers.js configuration. The Paddle worker
    loads them through the public <code>PreTrainedModel.from_pretrained</code> with a placeholder
    configuration and the file name <code>inference</code>, which yields a raw session and fetches
    exactly one file, so Dokseo never imports ONNX Runtime directly.
  </p>
  <p>
    On the CPU, ONNX Runtime can spread one matrix multiplication over several WebAssembly threads,
    and WebAssembly threads share memory through a <code>SharedArrayBuffer</code>. A browser
    provides that only to a cross-origin isolated page, which
    <a href="/docs/security-headers">Security headers</a> explains. When nothing sets the thread
    count, ONNX Runtime uses one thread on a page that is not isolated, and otherwise half the
    logical cores, rounded up, with at most {MAX_DEFAULT_WASM_THREADS}. I measured recognition as
    much faster once Dokseo's host sent the isolation headers.
  </p>
</DocsSection>

<DocsSection title={OCR_SECTIONS.compute}>
  <p>
    ONNX Runtime Web has two execution providers that matter here: WebAssembly on the CPU, and
    WebGPU on the graphics card. The engine settings offer three choices, and the worker resolves
    them with <code>chosenDevice</code>: <strong>CPU</strong> runs WebAssembly,
    <strong>GPU (WebGPU)</strong> runs WebGPU when <code>navigator.gpu.requestAdapter()</code>
    returns an adapter and WebAssembly otherwise, and <strong>Automatic</strong> runs WebAssembly. A language
    with no stored choice gets the CPU.
  </p>
  <p>
    Automatic used to pick WebGPU whenever an adapter existed. Then Firefox on macOS loaded
    manga-ocr onto WebGPU without an error and failed its first run with an <code>OrtRun()</code>
    buffer error, while the Korean model ran fine on the same GPU. An adapter only proves that a GPU exists;
    only running the model shows whether that GPU runs it. So Automatic now means the CPU, and choosing
    the GPU is a deliberate act with a fallback:
  </p>
  <StepList>
    <StepItem title="Open on WebGPU">
      <p>
        If creating the sessions on WebGPU throws, the worker opens them on WebAssembly instead.
      </p>
    </StepItem>
    <StepItem title="Race the first run">
      <p>
        The first recognition on WebGPU races a {deadlineSeconds} second deadline. A failure can reject
        or hang, so a rejection and a timeout are treated the same.
      </p>
    </StepItem>
    <StepItem title="Reopen on the CPU and retry">
      <p>
        On either, the worker stops using the GPU sessions, opens the model on WebAssembly, and
        reads the same crop again. The session it reports names the device it fell back from, and
        the engine pill shows it.
      </p>
    </StepItem>
  </StepList>
  <ComputeCheck />
</DocsSection>

<DocsSection title={OCR_SECTIONS.worker}>
  <p>
    In the recorded run the encoder took {RECORDED_BUBBLE_RUN.encoderMs} ms and the decoder loop
    {RECORDED_BUBBLE_RUN.decoderMs} ms. Work that long on the main thread would freeze scrolling and page
    turns, so each engine runs in its own module worker, started with
    <code>new Worker(new URL(…, import.meta.url), &lbrace; type: 'module' &rbrace;)</code>. The page
    and the worker exchange plain messages, typed on both sides by one protocol module.
  </p>
  <DocsCode label={WORKER_REQUESTS.label} code={WORKER_REQUESTS.code} />
  <p>
    The replies are <code>progress</code> while files load, <code>opened</code> with the device the
    model runs on, and <code>recognized</code> or <code>failed</code> for each crop, matched to its request
    by id.
  </p>
  <p>
    The crop travels in the message's transfer list. A transfer moves an <code>ImageBitmap</code>
    to the worker without copying its pixels, and leaves the page's handle detached, with a width and
    height of 0. The adapter therefore transfers the prepared bitmap it made itself, never the caller's
    crop, and the worker closes it once read.
  </p>
  <p>
    A worker starts when a book opens with its model's weights already stored, so the first capture
    does not wait for the model to load, or else at the first capture after consent. It lives until
    the reader closes the book or the engine settings change, and a worker that fails is discarded
    so the next capture starts a fresh one.
  </p>
</DocsSection>

<DocsSection title={OCR_SECTIONS.download}>
  <p>
    The default Japanese model is a {downloadMb(model)} MB download: {weightsMb(model)} MB of weights
    and {runtimeMb(model)} MB of runtime. Dokseo downloads nothing until the reader agrees, per language,
    in a dialog that states that figure. Weights already on the device count as agreement. Agreeing records
    a grant in IndexedDB that names the model id, so choosing another model brings the dialog back, and
    it requests persistent storage with <code>navigator.storage.persist()</code>, since the browser
    may otherwise evict the weights when space runs low.
  </p>
  <p>
    The weight files are large enough for a connection to drop partway. The worker replaces
    transformers.js's <code>fetch</code> with one that downloads each <code>.onnx</code> file of the
    model in 8 MiB range requests, appending each range to a part-file in the origin private file
    system. A pause, a closed tab or a lost connection then resumes from the bytes already held, and
    the part-file is deleted once the file is complete. Weight and runtime requests use
    <code>cache: 'no-store'</code>, so the browser's HTTP cache does not keep a second copy of files
    Dokseo already keeps.
  </p>
</DocsSection>

<DocsSection title={OCR_SECTIONS.cache}>
  <p>
    transformers.js keeps every file it downloads in the Cache API, in a cache named
    <code>transformers-cache</code>, keyed by the file's Hub URL, and checks that cache before it
    fetches anything. The ONNX Runtime binary goes in the same cache, keyed by its jsDelivr URL.
    Dokseo writes no model cache code of its own for these files. The Cache API belongs to an
    origin, so a development server, a preview build and the deployed site each hold their own copy.
  </p>
  <p>
    One file escaped that cache. The PaddleOCR worker fetches the model's character dictionary,
    <code>inference.yml</code>, itself, because no public transformers.js function fetches an
    arbitrary file from a model repository. It used <code>cache: 'force-cache'</code>, which relies
    on the HTTP cache. In Safari, on a built copy of the app served over HTTPS, I recognized Korean
    text online, then turned Wi-Fi off and recognized again in the same origin. It failed with
    <q>inference.yml failed with Load failed</q>, although the weights and the runtime were in
    <code>transformers-cache</code>. Safari had not served the dictionary from its HTTP cache.
  </p>
  <p>
    The fix stores the dictionary in the cache transformers.js uses, and reads it from there first.
  </p>
  <DocsCode label={DICTIONARY_CACHE_FIRST.label} code={DICTIONARY_CACHE_FIRST.code} />
  <p>
    The rule: a file the model needs offline belongs in the Cache API next to the weights, never in
    the HTTP cache.
  </p>
</DocsSection>
