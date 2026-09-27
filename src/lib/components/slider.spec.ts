import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Slider from './Slider.svelte';

type Given = {
  readonly ticks?: readonly number[];
  readonly dir?: 'ltr' | 'rtl';
  readonly valuetext?: string;
  readonly disabled?: boolean;
  readonly class?: string;
};

function markup(given: Given): string {
  return render(Slider, {
    props: { label: 'Go to page', value: 3, max: 9, ...given },
  }).body.replaceAll(/<!--[^>]*-->/gu, '');
}

function tickOffsets(html: string): readonly string[] {
  return [...html.matchAll(/class="slider-tick"[^>]*style="--slider-tick-at: ([^;"]*)/gu)].map(
    (found) => found[1] ?? '',
  );
}

describe('Slider', () => {
  it('renders a labelled range input from zero in steps of one unless told otherwise', () => {
    const html = markup({});

    expect(html).toMatch(/^<input[^>]*type="range"/u);
    expect(html).toContain('aria-label="Go to page"');
    expect(html).toContain('min="0"');
    expect(html).toContain('max="9"');
    expect(html).toContain('step="1"');
    expect(html).toContain('value="3"');
    expect(html).toContain('dir="ltr"');
  });

  it('announces the value text the caller supplies and mirrors on request', () => {
    const html = markup({ valuetext: 'Page 4 of 10', dir: 'rtl' });

    expect(html).toContain('aria-valuetext="Page 4 of 10"');
    expect(html).toContain('dir="rtl"');
  });

  it('puts the caller class on the input when it draws no ticks', () => {
    const html = markup({ class: 'flex-1', disabled: true });

    expect(html).toMatch(/<input[^>]*class="slider flex-1"/u);
    expect(html).toMatch(/<input[^>]*disabled/u);
    expect(html).not.toContain('slider-wrapper');
    expect(tickOffsets(html)).toEqual([]);
  });

  it('wraps the input and draws one hidden tick at each offset from the left edge', () => {
    const html = markup({ ticks: [12.5, 60], class: 'flex-1' });

    expect(html).toMatch(/^<div class="slider-wrapper flex-1">\s*<input[^>]*class="slider"/u);
    expect(tickOffsets(html)).toEqual(['12.5%', '60%']);
    expect(html).toMatch(/class="slider-tick" aria-hidden="true"/u);
  });
});
