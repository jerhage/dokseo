import { describe, expect, it } from 'vitest';
import type { GuideKind } from './guide-kind';
import { createTouchGuide } from './touch-guide.svelte';
import type { SeenGuides } from './touch-guide.svelte';

function seenGuides(...kinds: GuideKind[]): SeenGuides & { readonly kinds: GuideKind[] } {
  return {
    kinds,
    seen: (kind) => kinds.includes(kind),
    mark: (kind) => {
      if (!kinds.includes(kind)) kinds.push(kind);
    },
  };
}

describe('createTouchGuide', () => {
  it('makes the guide due when the surface opens on a kind never dismissed', () => {
    const guide = createTouchGuide(() => 'tap-zones', seenGuides());

    guide.open();

    expect(guide.due).toBe(true);
  });

  it('keeps the guide back when the surface opens on a kind already dismissed', () => {
    const guide = createTouchGuide(() => 'tap-zones', seenGuides('tap-zones'));

    guide.open();

    expect(guide.due).toBe(false);
  });

  it('makes a seen guide due again when it is recalled', () => {
    const guide = createTouchGuide(() => 'strip-scroll', seenGuides('strip-scroll'));

    guide.open();
    guide.recall();

    expect(guide.due).toBe(true);
  });

  it('marks the kind shown at the moment of dismissal as seen', () => {
    let kind: GuideKind = 'swipe-left';
    const seen = seenGuides();
    const guide = createTouchGuide(() => kind, seen);

    guide.open();
    kind = 'swipe-right';
    guide.dismiss();

    expect(guide.due).toBe(false);
    expect(seen.kinds).toEqual(['swipe-right']);
  });

  it('marks nothing seen when the surface closes', () => {
    const seen = seenGuides();
    const guide = createTouchGuide(() => 'vertical-pages', seen);

    guide.open();
    guide.close();

    expect(guide.due).toBe(false);
    expect(seen.kinds).toEqual([]);
  });

  it('shows the guide only where it is offered and while it is due', () => {
    const guide = createTouchGuide(() => 'tap-zones', seenGuides());

    expect(guide.due).toBe(false);
    expect(guide.shownWhen(true)).toBe(false);
    guide.open();
    expect(guide.shownWhen(false)).toBe(false);
    expect(guide.shownWhen(true)).toBe(true);
  });
});
