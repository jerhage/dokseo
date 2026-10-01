import { describe, expect, it } from 'vitest';
import type { ModelLoad } from '../../domain/model/model-load';
import { READING_SELECTION, modelLoadAnnouncement, modelLoadNote } from './model-load-text';

describe('modelLoadNote', () => {
  it('calls a load that reported no download a load, not a download', () => {
    const load: ModelLoad = { fraction: 0.37, source: 'cache', loadedBytes: 0, totalBytes: 0 };
    expect(modelLoadNote(load)).toBe('Loading the model · 37%');
  });

  it('calls a load that reported a download a download', () => {
    const load: ModelLoad = { fraction: 0.37, source: 'network', loadedBytes: 0, totalBytes: 0 };
    expect(modelLoadNote(load)).toBe('Downloading the model · 37%');
  });
});

describe('modelLoadAnnouncement', () => {
  it('announces a cached load as loading rather than downloading', () => {
    expect(
      modelLoadAnnouncement({ fraction: 0.37, source: 'cache', loadedBytes: 0, totalBytes: 0 }),
    ).toBe('Loading the recognition model, 37 percent.');
  });

  it('announces a fetched load as downloading', () => {
    expect(
      modelLoadAnnouncement({ fraction: 0.9, source: 'network', loadedBytes: 0, totalBytes: 0 }),
    ).toBe('Downloading the recognition model, 90 percent.');
  });

  it('agrees with the card note about whether bytes are being downloaded', () => {
    const cached: ModelLoad = { fraction: 0.5, source: 'cache', loadedBytes: 0, totalBytes: 0 };
    const fetched: ModelLoad = { fraction: 0.5, source: 'network', loadedBytes: 0, totalBytes: 0 };

    expect(modelLoadNote(cached).startsWith('Loading')).toBe(true);
    expect(modelLoadAnnouncement(cached).startsWith('Loading')).toBe(true);
    expect(modelLoadNote(fetched).startsWith('Downloading')).toBe(true);
    expect(modelLoadAnnouncement(fetched).startsWith('Downloading')).toBe(true);
  });

  it('announces a reading with no load in flight without naming the model', () => {
    expect(modelLoadAnnouncement(null)).toBe(READING_SELECTION);
  });
});
