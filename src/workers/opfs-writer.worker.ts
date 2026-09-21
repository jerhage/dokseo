import { directoryNamed } from '$lib/platform/opfs/directory';
import { describeCause } from '$lib/shared/cause';
import { WRITE_CHUNK_BYTES, chunkRanges } from './blob-chunks';
import type { OpfsWriteReply, OpfsWriteRequest } from './opfs-writer-protocol';

const UNSUPPORTED = 'This browser cannot write a file in the origin private file system';

type SyncAccess = {
  truncate(to: number): void;
  write(data: Uint8Array, options?: { at?: number }): number;
  flush(): void;
  close(): void;
};

type SyncWritableHandle = FileSystemFileHandle & {
  createSyncAccessHandle?: () => Promise<SyncAccess>;
};

type WorkerScope = {
  postMessage(reply: OpfsWriteReply): void;
  addEventListener(kind: 'message', listen: (event: MessageEvent<OpfsWriteRequest>) => void): void;
};

const scope = self as unknown as WorkerScope;

const post = scope.postMessage.bind(scope);

async function accessFor(request: OpfsWriteRequest): Promise<SyncAccess> {
  const parent = await directoryNamed(request.directory);
  const handle: SyncWritableHandle = await parent.getFileHandle(request.name, { create: true });

  const open = handle.createSyncAccessHandle;
  if (open === undefined) throw new Error(UNSUPPORTED);

  return await open.call(handle);
}

async function write(request: OpfsWriteRequest): Promise<void> {
  const total = request.blob.size;
  const access = await accessFor(request);

  try {
    access.truncate(0);
    post({ kind: 'written', id: request.id, written: 0, total });

    for (const chunk of chunkRanges(total, WRITE_CHUNK_BYTES)) {
      const bytes = await request.blob.slice(chunk.from, chunk.to).arrayBuffer();
      access.write(new Uint8Array(bytes), { at: chunk.from });
      post({ kind: 'written', id: request.id, written: chunk.to, total });
    }

    access.flush();
  } finally {
    access.close();
  }
}

async function run(request: OpfsWriteRequest): Promise<void> {
  try {
    await write(request);
    post({ kind: 'done', id: request.id });
  } catch (cause) {
    post({ kind: 'failed', id: request.id, cause: describeCause(cause) });
  }
}

let queued: Promise<void> = Promise.resolve();

scope.addEventListener('message', (event: MessageEvent<OpfsWriteRequest>) => {
  queued = queued.then(() => run(event.data));
});
