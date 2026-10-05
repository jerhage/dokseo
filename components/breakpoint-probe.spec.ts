import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import BreakpointProbe from './BreakpointProbe.svelte';

const BREAKPOINT_PROBE = BreakpointProbe as unknown as Component<Record<string, unknown>>;

describe('BreakpointProbe', () => {
  it('sizes a hidden probe to the breakpoint token it is given', () => {
    const html = render(BREAKPOINT_PROBE, {
      props: { breakpoint: '--breakpoint-compact' },
    }).body.replaceAll(/<!--[^>]*-->/gu, '');

    expect(html).toBe(
      '<div class="breakpoint-probe" aria-hidden="true" style="--breakpoint-probe-width: var(--breakpoint-compact);"></div>',
    );
  });
});
