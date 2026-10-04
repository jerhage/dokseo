import { describe, expect, it } from 'vitest';
import { NEWER_FIELD, SAMPLE_ROW_TEXT, SAVE_TIME, saveSummary, savedRow } from './row-save';
import type { RowSave } from './row-save';

function sampleWith(change: Readonly<Record<string, unknown>>): string {
  const row = JSON.parse(SAMPLE_ROW_TEXT) as Record<string, unknown>;
  return JSON.stringify({ ...row, ...change });
}

function saved(text: string): Extract<RowSave, { kind: 'saved' }> {
  const save = savedRow(text);
  if (save.kind !== 'saved') throw new Error(`Expected a save, got ${save.kind}`);
  return save;
}

describe('savedRow', () => {
  it('keeps a field the book type does not name, unchanged, in the written row', () => {
    const save = saved(SAMPLE_ROW_TEXT);

    expect(save.kept).toEqual([NEWER_FIELD]);
    expect(save.written[NEWER_FIELD]).toBe('kept as stored');
  });

  it('writes the edit and fills the absent series fields with null', () => {
    const save = saved(SAMPLE_ROW_TEXT);

    expect(save.written.lastReadAt).toBe(SAVE_TIME);
    expect(save.rewritten).toEqual([
      { field: 'seriesId', stored: 'absent', written: 'null' },
      { field: 'volume', stored: 'absent', written: 'null' },
    ]);
  });

  it('writes a fallback over the stored value, so a known field always wins', () => {
    const save = saved(sampleWith({ language: 'xx', seriesId: null, volume: null }));

    expect(save.written.language).toBe('ja');
    expect(save.rewritten).toEqual([{ field: 'language', stored: '"xx"', written: '"ja"' }]);
  });

  it('reports a row whose known field fails its check as unreadable', () => {
    expect(savedRow(sampleWith({ volume: 'three' }))).toEqual({
      kind: 'unreadable',
      reason: 'A stored book holds an unknown volume: three',
    });
  });

  it('rejects text that is not JSON and JSON that is not an object', () => {
    expect(savedRow('{').kind).toBe('not-json');
    expect(savedRow('[1]')).toEqual({ kind: 'not-a-row' });
    expect(savedRow('7')).toEqual({ kind: 'not-a-row' });
  });
});

describe('saveSummary', () => {
  it('names each outcome', () => {
    expect(saveSummary(savedRow('{')).title).toBe('Not JSON');
    expect(saveSummary({ kind: 'not-a-row' }).variant).toBe('danger');
    expect(saveSummary({ kind: 'unreadable', reason: 'r' }).title).toBe(
      'Unreadable, nothing written',
    );
    expect(saveSummary(saved(SAMPLE_ROW_TEXT)).text).toContain('stay as stored');
  });
});
