import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import StorageScreen from './StorageScreen.svelte';

const SCREEN = StorageScreen as unknown as Component<Record<string, unknown>>;

describe('StorageScreen', () => {
  it('announces the reading line from a live empty state while nothing is read yet', () => {
    const html = render(SCREEN, { props: { state: { kind: 'loading' } } }).body;

    expect(html).toMatch(
      /<div class="empty-state empty-state-inline"><p class="empty-state-message" aria-live="polite">Reading what is stored…<\/p>/u,
    );
  });
});
