import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it, vi } from 'vitest';
import StorageScreen from './StorageScreen.svelte';

vi.mock('$lib/shared/read-query.svelte', () => ({
  readQuery: () => ({ state: { kind: 'loading' }, reload: () => {} }),
}));

const SCREEN = StorageScreen as unknown as Component<Record<string, unknown>>;

describe('StorageScreen', () => {
  it('announces the reading line from a live empty state while nothing is read yet', () => {
    const storage = { readStorageAccount: () => new Promise(() => {}) };
    const html = render(SCREEN, { props: { storage } }).body;

    expect(html).toMatch(
      /<div class="empty-state empty-state-inline"><p class="empty-state-message" aria-live="polite">Reading what is stored…<\/p>/u,
    );
  });
});
