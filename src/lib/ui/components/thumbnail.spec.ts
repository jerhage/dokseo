import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { THUMBNAIL_RATIOS, THUMBNAIL_SIZES, thumbnailFraming } from './thumbnail';
import Thumbnail from './Thumbnail.svelte';

const THUMBNAIL = Thumbnail as unknown as Component<Record<string, unknown>>;

function markup(props: Record<string, unknown>): string {
  return render(THUMBNAIL, { props })
    .body.replaceAll(/<!--[^>]*-->/gu, '')
    .replaceAll(/>\s+</gu, '><');
}

describe('the thumbnail class maps', () => {
  it('names one class for each size but the default', () => {
    expect(THUMBNAIL_SIZES).toEqual({
      sm: ['thumbnail-sm'],
      md: [],
      lg: ['thumbnail-lg'],
    });
  });

  it('names the aspect utility for each ratio', () => {
    expect(THUMBNAIL_RATIOS).toEqual({
      portrait: ['aspect-portrait'],
      square: ['aspect-square'],
      video: ['aspect-video'],
    });
  });
});

describe('thumbnailFraming', () => {
  it('pairs the size with the ratio for a sized frame', () => {
    expect(thumbnailFraming(false, 'sm', 'square')).toEqual(['thumbnail-sm', 'aspect-square']);
  });
});

describe('Thumbnail', () => {
  it('renders a decorative portrait frame at the default size', () => {
    expect(markup({ src: 'blob:cover' })).toBe(
      '<span class="thumbnail aspect-portrait"><img src="blob:cover" alt=""/></span>',
    );
  });

  it('renders an empty blank frame while there is no image', () => {
    expect(markup({ src: null, size: 'lg' })).toBe(
      '<span class="thumbnail thumbnail-lg aspect-portrait"></span>',
    );
  });

  it('names an empty frame as an image when it has an alt text', () => {
    expect(markup({ src: null, alt: 'Cover of Dune', size: 'sm', bordered: true })).toBe(
      '<span class="thumbnail thumbnail-sm aspect-portrait thumbnail-bordered" role="img" aria-label="Cover of Dune"></span>',
    );
  });

  it('fills its parent without a ratio of its own and passes a class through', () => {
    expect(markup({ src: 'blob:cover', alt: 'Cover of Dune', fill: true, class: 'x' })).toBe(
      '<span class="thumbnail thumbnail-fill x"><img src="blob:cover" alt="Cover of Dune"/></span>',
    );
  });
});
