import { describe, expect, it } from 'vitest';
import { accountOf } from '../domain/storage-parts';
import type { StorageAccount, StoragePart } from '../domain/storage-parts';
import {
  allowanceNote,
  partFigure,
  persistenceNote,
  unnamedFigure,
  unnamedNote,
} from './storage-view.svelte';

const MODEL: StoragePart = {
  key: 'model',
  label: 'manga-ocr base',
  detail: '7 files',
  bytes: 205_000_000,
};

const RECORDS: StoragePart = {
  key: 'records',
  label: 'Book records',
  detail: 'no size is reported',
  bytes: null,
};

function account(parts: readonly StoragePart[], usage: number | null): StorageAccount {
  return accountOf(parts, usage === null ? null : { usage, quota: 11_133_000_000 }, false);
}

describe('partFigure', () => {
  it('says a part cannot be measured rather than printing a zero', () => {
    expect(partFigure(RECORDS)).toBe('not measurable');
    expect(partFigure(MODEL)).toBe('205 MB');
  });
});

describe('unnamedFigure', () => {
  it('reports nothing unnamed when the browser gives no total', () => {
    expect(unnamedFigure(account([MODEL], null))).toBeNull();
  });
});

describe('unnamedNote', () => {
  it('points at the parts that cannot be measured when there are some', () => {
    expect(unnamedNote(account([MODEL, RECORDS], 395_000_000))).toContain('cannot be measured');
  });

  it('claims nothing about unmeasured parts when every part was measured', () => {
    const note = unnamedNote(account([MODEL], 395_000_000));

    expect(note).toBe('bytes this app cannot name');
  });

  it('says every byte is named when the parts sum to the total', () => {
    expect(unnamedNote(account([MODEL], 205_000_000))).toBe(
      'every byte the browser counts is named above',
    );
  });

  it('says the parts overshoot when they come to more than the browser reports', () => {
    expect(unnamedNote(account([MODEL], 200_000_000))).toContain('more than the browser reports');
  });
});

describe('allowanceNote', () => {
  it('says what the browser allows when it reports a quota', () => {
    expect(allowanceNote(account([MODEL], 395_000_000))).toContain('11133 MB');
  });
});

describe('persistenceNote', () => {
  it('warns that the browser may reclaim the space without a grant', () => {
    expect(persistenceNote(account([MODEL], 395_000_000))).toContain('may reclaim');
  });
});
