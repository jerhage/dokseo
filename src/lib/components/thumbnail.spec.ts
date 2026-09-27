import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { THUMBNAIL_RATIOS, THUMBNAIL_SIZES, thumbnailContent, thumbnailRatio } from './thumbnail';
import Thumbnail from './Thumbnail.svelte';

const THUMBNAIL = Thumbnail as unknown as Component<Record<string, unknown>>;

function markup(props: Record<string, unknown>): string {
  return render(THUMBNAIL, { props })
    .body.replaceAll(/<!--[^>]*-->/gu, '')
    .replaceAll(/>\s+</gu, '><');
}

describe('the thumbnail class maps', () => {
  it('names one class for each size', () => {
    expect(THUMBNAIL_SIZES).toEqual({
      sm: ['thumbnail-sm'],
      md: ['thumbnail-md'],
      lg: ['thumbnail-lg'],
      fill: ['thumbnail-fill'],
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

describe('thumbnailRatio', () => {
  it('keeps the ratio for a sized frame', () => {
    expect(thumbnailRatio('sm', 'square')).toEqual(['aspect-square']);
  });

  it('drops the ratio for a frame that fills its parent', () => {
    expect(thumbnailRatio('fill', 'portrait')).toEqual([]);
  });
});

describe('thumbnailContent', () => {
  it('shows the image with its alt text when there is a source', () => {
    expect(thumbnailContent('blob:cover', '')).toEqual({
      kind: 'image',
      src: 'blob:cover',
      alt: '',
    });
  });

  it('names the empty frame when there is no source but an alt text', () => {
    expect(thumbnailContent(null, 'Cover of Dune')).toEqual({
      kind: 'named',
      label: 'Cover of Dune',
    });
  });

  it('leaves a decorative frame without a source blank', () => {
    expect(thumbnailContent(null, '')).toEqual({ kind: 'blank' });
  });
});

describe('Thumbnail', () => {
  it('renders a decorative portrait frame at the middle size', () => {
    expect(markup({ src: 'blob:cover' })).toBe(
      '<span class="thumbnail thumbnail-md aspect-portrait"><img src="blob:cover" alt=""/></span>',
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
    expect(markup({ src: 'blob:cover', alt: 'Cover of Dune', size: 'fill', class: 'x' })).toBe(
      '<span class="thumbnail thumbnail-fill x"><img src="blob:cover" alt="Cover of Dune"/></span>',
    );
  });
});
