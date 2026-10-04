import { contextReport } from '../../../domain/security-headers';
import type { ContextReport, FrameObservation } from '../../../domain/security-headers';

const PROBE_DEADLINE_MS = 3000;

const BLOB_WORKER_SOURCE = `let evaluates = false;
try {
  evaluates = new Function('return true')() === true;
} catch {}
postMessage({ isolated: crossOriginIsolated, evaluates });
`;

const CHAPTER_STATUS_ID = 'status';

const CHAPTER_DOCUMENT = `<!doctype html>
<meta charset="utf-8">
<p id="${CHAPTER_STATUS_ID}">The inline script did not run.</p>
<script>document.getElementById('${CHAPTER_STATUS_ID}').textContent = 'The inline script ran.';</script>
`;

function evaluatesHere(): boolean {
  try {
    return new Function('return true')() === true;
  } catch {
    return false;
  }
}

function pageReport(): ContextReport {
  return { isolated: crossOriginIsolated, evaluates: evaluatesHere() };
}

function workerReport(start: () => Worker): Promise<ContextReport | null> {
  return new Promise((resolve) => {
    const worker = start();
    const finish = (report: ContextReport | null): void => {
      clearTimeout(timer);
      worker.terminate();
      resolve(report);
    };
    const timer = setTimeout(() => finish(null), PROBE_DEADLINE_MS);
    worker.addEventListener('message', (event) => finish(contextReport(event.data)));
    worker.addEventListener('error', () => finish(null));
  });
}

function fileWorkerReport(): Promise<ContextReport | null> {
  return workerReport(
    () => new Worker(new URL('./policy-probe.worker.ts', import.meta.url), { type: 'module' }),
  );
}

async function blobWorkerReport(): Promise<ContextReport | null> {
  const url = URL.createObjectURL(new Blob([BLOB_WORKER_SOURCE], { type: 'text/javascript' }));
  try {
    return await workerReport(() => new Worker(url));
  } finally {
    URL.revokeObjectURL(url);
  }
}

function documentText(frame: HTMLIFrameElement): string | null {
  const framed = frame.contentDocument;
  if (framed === null) return null;
  return framed.getElementById(CHAPTER_STATUS_ID)?.textContent ?? framed.body?.textContent ?? '';
}

function observeFrame(
  host: HTMLElement,
  src: string,
  sandbox: string | null,
): Promise<FrameObservation> {
  return new Promise((resolve) => {
    const frame = host.ownerDocument.createElement('iframe');
    frame.className = 'visually-hidden';
    frame.title = 'Probe frame';
    if (sandbox !== null) frame.setAttribute('sandbox', sandbox);
    const finish = (observation: FrameObservation): void => {
      clearTimeout(timer);
      frame.remove();
      resolve(observation);
    };
    const timer = setTimeout(() => finish({ kind: 'timed-out' }), PROBE_DEADLINE_MS);
    frame.addEventListener(
      'load',
      () => finish({ kind: 'loaded', documentText: documentText(frame) }),
      {
        once: true,
      },
    );
    frame.src = src;
    host.append(frame);
  });
}

async function observeChapterFrame(
  host: HTMLElement,
  sandbox: string | null,
): Promise<FrameObservation> {
  const url = URL.createObjectURL(new Blob([CHAPTER_DOCUMENT], { type: 'text/html' }));
  try {
    return await observeFrame(host, url, sandbox);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export {
  BLOB_WORKER_SOURCE,
  CHAPTER_DOCUMENT,
  blobWorkerReport,
  fileWorkerReport,
  observeChapterFrame,
  observeFrame,
  pageReport,
};
