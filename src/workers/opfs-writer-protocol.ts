type OpfsWriteRequest = {
  readonly kind: 'write';
  readonly id: number;
  readonly directory: string;
  readonly name: string;
  readonly blob: Blob;
};

type OpfsWriteReply =
  | {
      readonly kind: 'written';
      readonly id: number;
      readonly written: number;
      readonly total: number;
    }
  | { readonly kind: 'done'; readonly id: number }
  | { readonly kind: 'failed'; readonly id: number; readonly cause: string };

export type { OpfsWriteRequest, OpfsWriteReply };
