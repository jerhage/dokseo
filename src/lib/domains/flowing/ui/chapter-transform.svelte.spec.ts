import { describe, expect, it } from 'vitest';
import { sanitiseChapter } from './chapter-sanitiser';
import { sanitiseResource } from './chapter-transform';
import type { ResourceDetail } from 'foliate-js/view.js';

const CHAPTER =
  '<html xmlns="http://www.w3.org/1999/xhtml"><body><p>一</p><script>window.stolen = 1;</script></body></html>';

const REPARSED = '<html><body><p>一</p><script>window.stolen = 1;</script></body></html>';

const COVER =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800"><script>window.stolen = 1;</script></svg>';

function declared(type: string, markup: string): ResourceDetail {
  return { data: Promise.resolve(new Blob([markup])), type, name: 'OEBPS/chapter-1.xhtml' };
}

async function served(detail: ResourceDetail): Promise<Document> {
  sanitiseResource(detail, sanitiseChapter);

  const markup = await detail.data;
  return new DOMParser().parseFromString(
    typeof markup === 'string' ? markup : '',
    'application/xhtml+xml',
  );
}

describe('sanitiseResource over the real policy', () => {
  it('removes the inline script from a chapter whose media type is mis-cased', async () => {
    const clean = await served(declared('Application/XHTML+XML', CHAPTER));

    expect(clean.querySelector('script')).toBeNull();
    expect(clean.documentElement.textContent).toBe('一');
  });

  it('removes the inline script from a mis-cased html chapter', async () => {
    const clean = await served(declared('Text/HTML', REPARSED));

    expect(clean.querySelector('script')).toBeNull();
    expect(clean.documentElement.textContent).toBe('一');
  });

  it('removes the inline script from a mis-cased standalone svg spine item', async () => {
    const clean = await served(declared('Image/SVG+XML', COVER));

    expect(clean.querySelector('script')).toBeNull();
    expect(clean.documentElement.getAttribute('viewBox')).toBe('0 0 600 800');
  });

  it('removes the inline script from a spine item declared as generic xml', async () => {
    const clean = await served(declared('application/xml', CHAPTER));

    expect(clean.querySelector('script')).toBeNull();
    expect(clean.documentElement.textContent).toBe('一');
  });

  it('removes the inline script from a spine item declared text/xml', async () => {
    const clean = await served(declared('text/xml', CHAPTER));

    expect(clean.querySelector('script')).toBeNull();
    expect(clean.documentElement.textContent).toBe('一');
  });

  it('removes the inline script from a chapter whose media type carries a charset', async () => {
    const clean = await served(declared('application/xhtml+xml; charset=utf-8', CHAPTER));

    expect(clean.querySelector('script')).toBeNull();
    expect(clean.documentElement.textContent).toBe('一');
  });

  it('removes the inline script from a chapter whose media type is padded', async () => {
    const clean = await served(declared(' application/xhtml+xml ', CHAPTER));

    expect(clean.querySelector('script')).toBeNull();
    expect(clean.documentElement.textContent).toBe('一');
  });
});
