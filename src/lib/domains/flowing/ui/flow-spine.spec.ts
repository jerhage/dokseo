import { describe, expect, it } from 'vitest';
import {
  hasNoBody,
  leaveOutSectionsWithNoBody,
  OUT_OF_THE_READING_ORDER,
  sectionWithABody,
  spineOf,
} from './flow-spine';
import type { Spine, Spined } from './flow-spine';

const XHTML = 'application/xhtml+xml';

const SVG = 'image/svg+xml';

function book(mediaTypes: readonly string[]): Spined {
  const sections = mediaTypes.map((_mediaType, index) => ({ id: `item-${index}` }));
  const declared = new Map(sections.map((section, index) => [section.id, mediaTypes[index]]));

  return {
    sections,
    resources: {
      getItemByHref: (href: string) => {
        const mediaType = declared.get(href);
        return mediaType === undefined ? undefined : { mediaType };
      },
    },
  };
}

function spine(sections: number, withoutABody: readonly number[]): Spine {
  return { sections, withoutABody };
}

describe('hasNoBody', () => {
  it('names a standalone svg spine item as having no body element', () => {
    expect(hasNoBody(SVG)).toBe(true);
  });

  it('names a mis-cased, parameterised svg spine item as having no body element', () => {
    expect(hasNoBody(' Image/SVG+XML ; charset=utf-8 ')).toBe(true);
  });

  it('leaves a chapter alone', () => {
    expect(hasNoBody(XHTML)).toBe(false);
  });

  it('leaves a spine item whose manifest entry declares no media type alone', () => {
    expect(hasNoBody(null)).toBe(false);
    expect(hasNoBody(undefined)).toBe(false);
  });
});

describe('spineOf', () => {
  it('reports which sections the paginator has no body element to lay out', () => {
    expect(spineOf(book([SVG, XHTML, XHTML, SVG]))).toEqual(spine(4, [0, 3]));
  });

  it('reports nothing missing when every section is a chapter', () => {
    expect(spineOf(book([XHTML, XHTML]))).toEqual(spine(2, []));
  });

  it('reports a spine item the manifest does not name as a chapter', () => {
    const unlisted: Spined = {
      sections: [{ id: 'gone.xhtml' }],
      resources: { getItemByHref: () => undefined },
    };

    expect(spineOf(unlisted)).toEqual(spine(1, []));
  });
});

describe('leaveOutSectionsWithNoBody', () => {
  it('takes a section with no body element out of the reading order', () => {
    const held = book([SVG, XHTML, SVG]);

    leaveOutSectionsWithNoBody(held, spineOf(held));

    expect(held.sections.map((section) => section.linear)).toEqual([
      OUT_OF_THE_READING_ORDER,
      undefined,
      OUT_OF_THE_READING_ORDER,
    ]);
  });
});

describe('sectionWithABody', () => {
  it('keeps a section that has one', () => {
    expect(sectionWithABody(spine(3, [0]), 2)).toBe(2);
  });

  it('moves on to the next section that has one', () => {
    expect(sectionWithABody(spine(4, [0, 1]), 0)).toBe(2);
  });

  it('falls back to the section before when nothing after it has one', () => {
    expect(sectionWithABody(spine(3, [2]), 2)).toBe(1);
  });

  it('reports nothing when no section has one', () => {
    expect(sectionWithABody(spine(2, [0, 1]), 0)).toBeNull();
  });

  it('keeps a target outside the spine, so foliate refuses it as it always did', () => {
    expect(sectionWithABody(spine(2, [0]), 9)).toBe(9);
  });
});
