import { describe, expect, it } from 'vitest';
import { READING_SELECTION, modelLoadAnnouncement, modelLoadNote } from './model-load-text';

describe('modelLoadNote', () => {
  it.each([
    ['no download a load, not a download', 'cache', 'Loading the model · 37%'],
    ['a download a download', 'network', 'Downloading the model · 37%'],
  ] as const)('calls a load that reported %s', (_name, source, note) => {
    expect(modelLoadNote({ fraction: 0.37, source, loadedBytes: 0, totalBytes: 0 })).toBe(note);
  });
});

describe('modelLoadAnnouncement', () => {
  it.each([
    [
      'a cached load as loading rather than downloading',
      0.37,
      'cache',
      'Loading the recognition model, 37 percent.',
    ],
    [
      'a fetched load as downloading',
      0.9,
      'network',
      'Downloading the recognition model, 90 percent.',
    ],
  ] as const)('announces %s', (_name, fraction, source, announcement) => {
    expect(modelLoadAnnouncement({ fraction, source, loadedBytes: 0, totalBytes: 0 })).toBe(
      announcement,
    );
  });

  it('announces a reading with no load in flight without naming the model', () => {
    expect(modelLoadAnnouncement(null)).toBe(READING_SELECTION);
  });
});
