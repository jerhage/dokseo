import { describeCause } from '$lib/shared/cause';
import { SCRATCH_DIRECTORY, SCRATCH_FILE } from './scratch-file-protocol';
import type { ScratchFileReply, ScratchFileRequest } from './scratch-file-protocol';

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
  postMessage(reply: ScratchFileReply): void;
  addEventListener(
    kind: 'message',
    listen: (event: MessageEvent<ScratchFileRequest>) => void,
  ): void;
};

const scope = self as unknown as WorkerScope;

const post = scope.postMessage.bind(scope);

async function writeNote(text: string): Promise<number> {
  const root = await navigator.storage.getDirectory();
  const folder = await root.getDirectoryHandle(SCRATCH_DIRECTORY, { create: true });
  const handle: SyncWritableHandle = await folder.getFileHandle(SCRATCH_FILE, { create: true });

  const open = handle.createSyncAccessHandle;
  if (open === undefined) throw new Error('This browser has no createSyncAccessHandle()');

  const access = await open.call(handle);
  try {
    access.truncate(0);
    const written = access.write(new TextEncoder().encode(text), { at: 0 });
    access.flush();
    return written;
  } finally {
    access.close();
  }
}

scope.addEventListener('message', (event) => {
  writeNote(event.data.text).then(
    (bytes) => post({ kind: 'written', bytes }),
    (cause: unknown) => post({ kind: 'failed', cause: describeCause(cause) }),
  );
});
