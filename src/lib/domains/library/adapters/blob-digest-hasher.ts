import { describeCause } from '$lib/shared/cause';
import type { ContentDigest, ContentHasher } from '../domain/ingest/content-hasher';

function blobDigestHasher(digestOf: (blob: Blob) => Promise<string>): ContentHasher {
  return async (blob: Blob): Promise<ContentDigest> => {
    let digest: string;
    try {
      digest = await digestOf(blob);
    } catch (cause) {
      return { kind: 'unreadable', cause: describeCause(cause) };
    }
    return { kind: 'success', digest };
  };
}

export { blobDigestHasher };
