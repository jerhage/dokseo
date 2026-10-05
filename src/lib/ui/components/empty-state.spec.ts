import { createRawSnippet } from 'svelte';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { EMPTY_STATE_VARIANTS } from './empty-state';
import EmptyState from './EmptyState.svelte';

const EMPTY_STATE = EmptyState as unknown as Component<Record<string, unknown>>;

const BACK = createRawSnippet(() => ({ render: () => '<a href="/">Back</a>' }));

function markup(props: Record<string, unknown>): string {
  return render(EMPTY_STATE, { props: { message: 'Nothing here yet.', ...props } })
    .body.replaceAll(/<!--[^>]*-->/gu, '')
    .replaceAll(/>\s+</gu, '><');
}

describe('EMPTY_STATE_VARIANTS', () => {
  it('names one class for each variant', () => {
    expect(EMPTY_STATE_VARIANTS).toEqual({
      fill: ['empty-state-fill'],
      inline: ['empty-state-inline'],
    });
  });
});

describe('EmptyState', () => {
  it('renders the message inline and quiet unless told otherwise', () => {
    const html = markup({});

    expect(html).toBe(
      '<div class="empty-state empty-state-inline"><p class="empty-state-message">Nothing here yet.</p></div>',
    );
  });

  it('fills its area, announces the message politely and follows it with the action', () => {
    const html = markup({ variant: 'fill', live: true, action: BACK, class: 'flex-1' });

    expect(html).toBe(
      '<div class="empty-state empty-state-fill flex-1"><p class="empty-state-message" aria-live="polite">Nothing here yet.</p><a href="/">Back</a></div>',
    );
  });
});
