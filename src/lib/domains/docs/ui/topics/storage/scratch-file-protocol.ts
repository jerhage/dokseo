const SCRATCH_DIRECTORY = 'dokseo-docs-scratch';

const SCRATCH_FILE = 'note.txt';

type ScratchFileRequest = { readonly kind: 'write'; readonly text: string };

type ScratchFileReply =
  | { readonly kind: 'written'; readonly bytes: number }
  | { readonly kind: 'failed'; readonly cause: string };

export { SCRATCH_DIRECTORY, SCRATCH_FILE };
export type { ScratchFileReply, ScratchFileRequest };
