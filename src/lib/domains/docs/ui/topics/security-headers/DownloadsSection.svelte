<script lang="ts">
  import Diagram from '$lib/ui/components/Diagram.svelte';
  import type { DiagramBox } from '$lib/ui/components/diagram';
  import Figure from '$lib/ui/components/Figure.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { SECTIONS, sectionHref } from './sections';

  const PLUGIN = `const BUNDLED_RUNTIME = /ort-wasm[^/]*\\.wasm$/u;

function runtimeServedFromCdn(): Plugin {
  return {
    name: 'onnx-runtime-served-from-cdn',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const name of Object.keys(bundle)) {
        if (BUNDLED_RUNTIME.test(name)) delete bundle[name];
      }
    },
  };
}`;

  const page: DiagramBox = {
    kind: 'box',
    x: 80,
    y: 8,
    width: 200,
    height: 52,
    label: 'Dokseo page',
    detail: 'COOP, COEP, CSP',
    tone: 'primary',
  };
  const worker: DiagramBox = {
    kind: 'box',
    x: 80,
    y: 108,
    width: 200,
    height: 52,
    label: 'OCR worker',
    detail: 'its own file, no CSP',
    tone: 'accent',
  };
  const hub: DiagramBox = {
    kind: 'box',
    x: 4,
    y: 216,
    width: 168,
    height: 52,
    label: 'huggingface.co',
    detail: 'model weights',
  };
  const cdn: DiagramBox = {
    kind: 'box',
    x: 188,
    y: 216,
    width: 168,
    height: 52,
    label: 'cdn.jsdelivr.net',
    detail: 'ONNX Runtime',
  };
</script>

<DocsSection title={SECTIONS.downloads}>
  <p>
    Dokseo runs OCR in a module worker started from a file:
    <code>src/workers/ocr.worker.ts</code> for Japanese, <code>paddle-ocr.worker.ts</code> for
    Korean. Inside the worker, transformers.js fetches the model's files from
    <code>huggingface.co</code>, and the large ones redirect to a CDN host under
    <code>hf.co</code>, such as <code>us.aws.cdn.hf.co</code>. The ONNX Runtime WebAssembly files
    come from <code>cdn.jsdelivr.net</code>. When onnxruntime-web's <code>wasmPaths</code> is unset, transformers.js
    sets it to that host, at the onnxruntime-web version it was built against, and Dokseo never sets it.
  </p>
  <Figure>
    <Diagram
      label="The Dokseo page starts the OCR worker, and the worker fetches model weights from huggingface.co and the ONNX Runtime from cdn.jsdelivr.net, both in cors mode"
      width={360}
      height={276}
      nodes={[page, worker, hub, cdn]}
      edges={[
        { from: page, to: worker, label: 'new Worker' },
        { from: worker, to: hub, label: 'cors' },
        { from: worker, to: cdn, label: 'cors' },
      ]}
    />
    {#snippet caption()}Every model download is a worker request.{/snippet}
  </Figure>
  <p>
    Each of these responses is cross-origin, and the worker is under COEP like the page. They load
    because <code>fetch()</code> uses <code>cors</code> mode and both hosts send
    <code>Access-Control-Allow-Origin</code>. As
    <a href={sectionHref('embedder')}>the COEP rules</a>
    say, a request that passes CORS needs nothing more. Dokseo loads nothing from another origin in
    <code>no-cors</code> mode: no web fonts, scripts or images from other hosts. That is what makes
    isolation cost nothing here, and it is worth keeping: a resource added later in
    <code>no-cors</code> mode, from a server that sends no
    <code>Cross-Origin-Resource-Policy</code>, would be blocked even with its host added to the
    policy.
  </p>
  <p>
    The worker file runs under no CSP, so <code>connect-src</code> does not govern these fetches.
    The policy still lists <code>huggingface.co</code>, <code>*.hf.co</code>,
    <code>*.huggingface.co</code> and <code>cdn.jsdelivr.net</code>. I kept them because the page's
    allowed hosts should not depend on which thread a fetch happens to run in, and because a model
    fetch moved to the main thread would otherwise fail with nothing but a console line.
  </p>
  <p>
    The runtime files raised one build problem. ONNX Runtime refers to its own
    <code>.wasm</code> file through <code>new URL(…, import.meta.url)</code>, so Vite copied
    <code>ort-wasm-simd-threaded.asyncify.wasm</code>, 25.6 MiB, into the build. Cloudflare rejects
    any asset over 25 MiB, so the deploy failed, for a file the app never fetches because the
    runtime loads from jsDelivr. A build-only plugin in <code>vite.config.ts</code> deletes it from the
    bundle:
  </p>
  <DocsCode label="vite.config.ts, the runtime plugin" code={PLUGIN} />
</DocsSection>
