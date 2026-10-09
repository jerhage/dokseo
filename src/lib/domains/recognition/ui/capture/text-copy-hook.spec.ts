import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { captureId } from '$lib/shared/ids';
import type { Notice } from '$lib/shared/notice';
import { COPIED_FOR, createTextCopy } from './text-copy.svelte';
import type { ClipboardWrite } from './text-copy.svelte';

const lifecycle = vi.hoisted(() => ({ destroyers: [] as (() => void)[] }));

vi.mock('svelte', () => ({
  onDestroy: (teardown: () => void) => {
    lifecycle.destroyers.push(teardown);
  },
}));

const CARD = captureId('c1');

function copying(write: ClipboardWrite) {
  const written: string[] = [];
  const notices: Notice[] = [];
  const copy = createTextCopy(
    (text) => {
      written.push(text);
      return write(text);
    },
    (notice) => {
      notices.push(notice);
    },
  );

  return { copy, written, notices };
}

describe('createTextCopy', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    lifecycle.destroyers.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks the card as copied, says so, and raises no toast', async () => {
    const held = copying(() => Promise.resolve());

    await held.copy.copy(CARD, 'ねこ');

    expect(held.written).toEqual(['ねこ']);
    expect(held.copy.copied).toBe(CARD);
    expect(held.copy.told).toBe('Copied the text');
    expect(held.notices).toEqual([]);
  });

  it('clears the copied mark once the moment has passed', async () => {
    const held = copying(() => Promise.resolve());

    await held.copy.copy(CARD, 'ねこ');
    vi.advanceTimersByTime(COPIED_FOR);

    expect(held.copy.copied).toBeNull();
  });

  it('stops the pending moment when the component is destroyed', async () => {
    const held = copying(() => Promise.resolve());

    await held.copy.copy(CARD, 'ねこ');
    for (const teardown of lifecycle.destroyers) teardown();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('reports a refused copy once as a danger toast and marks nothing copied', async () => {
    const held = copying(() => Promise.reject(new Error('Document is not focused.')));

    await held.copy.copy(CARD, 'ねこ');

    expect(held.copy.copied).toBeNull();
    expect(held.copy.told).toBe('');
    expect(held.notices).toEqual([
      {
        tone: 'danger',
        title: 'The text could not be copied',
        message: 'Document is not focused.',
      },
    ]);
  });
});
