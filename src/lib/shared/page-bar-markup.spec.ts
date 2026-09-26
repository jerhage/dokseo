import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import PageBar from './PageBar.svelte';

const BAR = PageBar as unknown as Component<Record<string, unknown>>;

function markup(props: Record<string, unknown>): string {
  return render(BAR, {
    props: {
      first: null,
      second: null,
      steps: 5,
      at: 2,
      direction: 'ltr',
      enabled: true,
      markerAt: (step: number) => `step ${step}`,
      onscrub: () => undefined,
      ...props,
    },
  }).body;
}

function offsets(html: string): readonly string[] {
  return [...html.matchAll(/class="tick"[^>]*style="--at: ([^;"]*)/gu)].map(
    (found) => found[1] ?? '',
  );
}

describe('PageBar', () => {
  it('draws one tick at each offset it is given, over the scrubber', () => {
    const html = markup({ ticks: [12.5, 60] });

    expect(offsets(html)).toEqual(['12.5%', '60%']);
    expect(html).toMatch(/class="gauge[^"]*"[^>]*>\s*<input/u);
  });

  it('draws no ticks and no gauge when it is given none', () => {
    const html = markup({});

    expect(offsets(html)).toEqual([]);
    expect(html).not.toContain('gauge');
  });

  it('names the scrubber for pages unless told otherwise', () => {
    expect(markup({})).toContain('aria-label="Go to page"');
    expect(markup({ label: 'Reading progress' })).toContain('aria-label="Reading progress"');
  });
});
