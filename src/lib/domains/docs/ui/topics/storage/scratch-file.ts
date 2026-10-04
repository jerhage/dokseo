import { SCRATCH_DIRECTORY, SCRATCH_FILE } from './scratch-file-protocol';
import type { ScratchFileReply, ScratchFileRequest } from './scratch-file-protocol';

type ScratchFileContent = { readonly text: string; readonly bytes: number };

type RootEntry = { readonly name: string; readonly kind: 'file' | 'directory' };

type ScratchFileStore = {
  available(): boolean;
  write(text: string): Promise<number>;
  read(): Promise<ScratchFileContent | null>;
  remove(): Promise<void>;
  root(): Promise<readonly RootEntry[]>;
};

function isMissing(cause: unknown): boolean {
  return cause instanceof Error && cause.name === 'NotFoundError';
}

function startWriter(): Worker {
  return new Worker(new URL('./scratch-file.worker.ts', import.meta.url), { type: 'module' });
}

function writeInWorker(text: string): Promise<number> {
  const worker = startWriter();
  return new Promise<number>((resolve, reject) => {
    worker.addEventListener('message', (event: MessageEvent<ScratchFileReply>) => {
      const reply = event.data;
      if (reply.kind === 'written') resolve(reply.bytes);
      else reject(new Error(reply.cause));
    });
    worker.addEventListener('error', (event: ErrorEvent) => reject(new Error(event.message)));
    const request: ScratchFileRequest = { kind: 'write', text };
    worker.postMessage(request, []);
  }).finally(() => worker.terminate());
}

async function readNote(): Promise<ScratchFileContent | null> {
  try {
    const root = await navigator.storage.getDirectory();
    const folder = await root.getDirectoryHandle(SCRATCH_DIRECTORY);
    const file = await (await folder.getFileHandle(SCRATCH_FILE)).getFile();
    return { text: await file.text(), bytes: file.size };
  } catch (cause) {
    if (isMissing(cause)) return null;
    throw cause;
  }
}

async function removeFolder(): Promise<void> {
  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(SCRATCH_DIRECTORY, { recursive: true });
  } catch (cause) {
    if (isMissing(cause)) return;
    throw cause;
  }
}

async function rootEntries(): Promise<readonly RootEntry[]> {
  const root = await navigator.storage.getDirectory();
  const found: RootEntry[] = [];
  for await (const handle of root.values()) found.push({ name: handle.name, kind: handle.kind });
  return found.toSorted((a, b) => a.name.localeCompare(b.name));
}

function createScratchFileStore(): ScratchFileStore {
  return {
    available: () =>
      typeof navigator !== 'undefined' && typeof navigator.storage?.getDirectory === 'function',
    write: writeInWorker,
    read: readNote,
    remove: removeFolder,
    root: rootEntries,
  };
}

export { createScratchFileStore };
export type { RootEntry, ScratchFileContent, ScratchFileStore };
