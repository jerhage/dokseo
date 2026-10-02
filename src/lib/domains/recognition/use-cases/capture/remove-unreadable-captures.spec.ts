import { describe, expect, it } from 'vitest';
import { captureId } from '$lib/shared/ids';
import type { CaptureId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { CaptureRepository, CaptureWrite } from '../../domain/capture/capture-repository';
import { removeUnreadableCaptures } from './remove-unreadable-captures';

function repository(outcome: CaptureWrite) {
  const removed: CaptureId[] = [];
  const captures: CaptureRepository = {
    listForBook: () => Promise.reject(new Error('not used')),
    listEverything: () => Promise.reject(new Error('not used')),
    save: () => Promise.reject(new Error('not used')),
    remove: (capture) => {
      removed.push(capture);
      return Promise.resolve(outcome);
    },
    clearBook: () => Promise.reject(new Error('not used')),
  };
  return { captures, removed };
}

describe('removeUnreadableCaptures', () => {
  it('removes each capture by its id', async () => {
    const held = repository({ kind: 'success' });

    const result = await removeUnreadableCaptures(held, [captureId('a'), captureId('b')]);

    expect(result).toEqual({ kind: 'success' });
    expect(held.removed).toEqual(['a', 'b']);
  });

  it('stops at the first refusal and returns it', async () => {
    const held = repository(STORAGE_UNAVAILABLE);

    const result = await removeUnreadableCaptures(held, [captureId('a'), captureId('b')]);

    expect(result).toBe(STORAGE_UNAVAILABLE);
    expect(held.removed).toEqual(['a']);
  });
});
