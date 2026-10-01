type ContentDigest =
  | { readonly kind: 'success'; readonly digest: string }
  | { readonly kind: 'unreadable'; readonly cause: string };

type ContentHasher = (blob: Blob) => Promise<ContentDigest>;

export type { ContentDigest, ContentHasher };
