import { describe, expect, it } from 'vitest';
import type { FileToSave } from '$lib/platform/files/save-file';
import { savedRowsText } from './unreadable-rows-rules';

const FILE: FileToSave = {
  text: '{"format":"dokseo-captures"}',
  name: 'dokseo-unreadable-2026-10-04.json',
  type: 'application/json',
};

describe('savedRowsText', () => {
  it.each([
    [{ captures: 1, tags: 0 }, 'Saved 1 unreadable capture.'],
    [{ captures: 0, tags: 2 }, 'Saved 2 unreadable tags.'],
    [{ captures: 0, tags: 1 }, 'Saved 1 unreadable tag.'],
    [{ captures: 2, tags: 1 }, 'Saved 3 unreadable rows.'],
  ])('counts %j as %s', (counts, text) => {
    expect(savedRowsText({ file: FILE, ...counts })).toBe(text);
  });
});
