import { describe, expect, it } from 'vitest';
import { sanitiseChapter } from './chapter-sanitiser';
import type { ChapterMarkup } from './chapter-sanitiser';

const XHTML: ChapterMarkup = 'application/xhtml+xml';

const HTML: ChapterMarkup = 'text/html';

const SVG: ChapterMarkup = 'image/svg+xml';

const XML: ChapterMarkup = 'application/xml';

const A_STYLESHEET_FOLIATE_REWROTE = 'blob:http://localhost/2f1c-sheet';

const A_PICTURE_FOLIATE_REWROTE = 'blob:http://localhost/2f1c-picture';

const A_FONT_FOLIATE_REWROTE = 'blob:http://localhost/2f1c-font';

const A_COVER_FOLIATE_REWROTE = 'blob:http://localhost/2f1c-cover';

function chapter(head: string, body: string): string {
  return `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ja"><head>${head}</head><body>${body}</body></html>`;
}

function spineSvg(root: string, drawing: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ${root}>${drawing}</svg>`;
}

function rendered(markup: string, mediaType: ChapterMarkup = XHTML): Document {
  return new DOMParser().parseFromString(sanitiseChapter(markup, mediaType), mediaType);
}

describe('sanitiseChapter', () => {
  it('removes an inline script a book put in its chapter', () => {
    const clean = rendered(chapter('', '<p>一</p><script>window.stolen = 1;</script>'));

    expect(clean.querySelector('script')).toBeNull();
    expect(clean.documentElement.textContent).toBe('一');
  });

  it('removes an inline script from a chapter foliate reparsed as html', () => {
    const clean = rendered(
      '<html><body><p>一</p><script>window.stolen = 1;</script></body></html>',
      HTML,
    );

    expect(clean.querySelector('script')).toBeNull();
  });

  it('strips the event handler attributes a script would run from', () => {
    const clean = rendered(
      chapter(
        '',
        '<img src="x.png" onerror="window.stolen = 1;" /><p onload="window.stolen = 2;">一</p>',
      ),
    );

    expect(clean.querySelector('[onerror]')).toBeNull();
    expect(clean.querySelector('[onload]')).toBeNull();
  });

  it('removes the elements that would load a page of their own', () => {
    const clean = rendered(
      chapter(
        '<base href="http://elsewhere.example/" />',
        '<iframe src="http://elsewhere.example/"></iframe><object data="x.swf"></object><embed src="x.swf" />',
      ),
    );

    for (const tag of ['base', 'iframe', 'object', 'embed']) {
      expect(clean.querySelector(tag)).toBeNull();
    }
  });

  it('removes a form a chapter would post from', () => {
    const clean = rendered(
      chapter('', '<form action="http://elsewhere.example/"><p>一</p></form>'),
    );

    expect(clean.querySelector('form')).toBeNull();
    expect(clean.documentElement.textContent).toBe('一');
  });

  it('disarms a meta refresh while the declared encoding survives', () => {
    const clean = rendered(
      '<html><head><meta charset="utf-8" /><meta http-equiv="refresh" content="0;url=http://elsewhere.example/" /></head><body><p>一</p></body></html>',
      HTML,
    );

    expect(clean.querySelector('[http-equiv]')).toBeNull();
    expect(clean.querySelector('meta[charset]')?.getAttribute('charset')).toBe('utf-8');
  });

  it('keeps the blob url foliate minted for a picture', () => {
    const clean = rendered(chapter('', `<img src="${A_PICTURE_FOLIATE_REWROTE}" alt="扉" />`));

    expect(clean.querySelector('img')?.getAttribute('src')).toBe(A_PICTURE_FOLIATE_REWROTE);
  });

  it("keeps the blob url foliate minted for the book's stylesheet", () => {
    const clean = rendered(
      chapter(
        `<link rel="stylesheet" type="text/css" href="${A_STYLESHEET_FOLIATE_REWROTE}" />`,
        '<p>一</p>',
      ),
    );
    const sheet = clean.querySelector('link');

    expect(sheet?.getAttribute('href')).toBe(A_STYLESHEET_FOLIATE_REWROTE);
    expect(sheet?.getAttribute('rel')).toBe('stylesheet');
  });

  it("keeps the blob url foliate minted for the book's font", () => {
    const face = `@font-face { font-family: Mincho; src: url("${A_FONT_FOLIATE_REWROTE}"); }`;
    const clean = rendered(chapter(`<style>${face}</style>`, '<p>一</p>'));

    expect(clean.querySelector('style')?.textContent).toBe(face);
  });

  it('keeps an svg cover whole, blob url and scaling alike', () => {
    const clean = rendered(
      chapter(
        '',
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid meet"><image width="600" height="800" xlink:href="${A_COVER_FOLIATE_REWROTE}" /></svg>`,
      ),
    );
    const cover = clean.querySelector('svg');
    const picture = clean.querySelector('image');

    expect(cover?.getAttribute('viewBox')).toBe('0 0 600 800');
    expect(cover?.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
    expect(picture?.getAttributeNS('http://www.w3.org/1999/xlink', 'href')).toBe(
      A_COVER_FOLIATE_REWROTE,
    );
  });

  it('keeps the ruby a japanese book reads by', () => {
    const clean = rendered(
      chapter('', '<p><ruby>漢字<rp>(</rp><rt>かんじ</rt><rp>)</rp></ruby></p>'),
    );

    expect(clean.querySelector('ruby rt')?.textContent).toBe('かんじ');
    expect(clean.querySelectorAll('rp')).toHaveLength(2);
  });

  it('keeps the epub:type a book marks its notes and matter with', () => {
    const clean = rendered(chapter('', '<a epub:type="noteref" href="#n1">1</a>'));

    expect(clean.querySelector('a')?.getAttributeNS('http://www.idpf.org/2007/ops', 'type')).toBe(
      'noteref',
    );
  });

  it('keeps the language a book declares, so its kanji pick japanese glyphs', () => {
    const clean = rendered(chapter('', '<p>一</p>'));

    expect(
      clean.documentElement.getAttributeNS('http://www.w3.org/XML/1998/namespace', 'lang'),
    ).toBe('ja');
  });

  it('removes an inline script from a standalone svg spine item', () => {
    const clean = rendered(
      spineSvg('', '<script>window.stolen = 1;</script><rect width="600" height="800" />'),
      SVG,
    );

    expect(clean.querySelector('script')).toBeNull();
    expect(clean.querySelector('rect')).not.toBeNull();
  });

  it('strips the handler a standalone svg spine item would run on its own root', () => {
    const clean = rendered(
      spineSvg('onload="window.stolen = 1;"', '<rect width="600" height="800" />'),
      SVG,
    );

    expect(clean.documentElement.hasAttribute('onload')).toBe(false);
    expect(clean.querySelector('rect')).not.toBeNull();
  });

  it('keeps both blob urls foliate minted inside a standalone svg spine item', () => {
    const clean = rendered(
      spineSvg(
        '',
        `<image width="600" height="800" xlink:href="${A_COVER_FOLIATE_REWROTE}" /><image width="600" height="800" href="${A_PICTURE_FOLIATE_REWROTE}" />`,
      ),
      SVG,
    );
    const [linked, plain] = clean.querySelectorAll('image');

    expect(linked?.getAttributeNS('http://www.w3.org/1999/xlink', 'href')).toBe(
      A_COVER_FOLIATE_REWROTE,
    );
    expect(plain?.getAttribute('href')).toBe(A_PICTURE_FOLIATE_REWROTE);
  });

  it('keeps the scaling a standalone svg spine item is drawn by', () => {
    const clean = rendered(
      spineSvg(
        'viewBox="0 0 600 800" preserveAspectRatio="xMidYMid meet"',
        '<rect width="600" height="800" />',
      ),
      SVG,
    );

    expect(clean.documentElement.getAttribute('viewBox')).toBe('0 0 600 800');
    expect(clean.documentElement.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
  });

  it('removes the inline script from a spine item served as generic xml', () => {
    const clean = rendered(chapter('', '<p>一</p><script>window.stolen = 1;</script>'), XML);

    expect(clean.querySelector('script')).toBeNull();
    expect(clean.documentElement.textContent).toBe('一');
  });

  it('removes the inline script from an svg spine item served as generic xml', () => {
    const clean = rendered(
      spineSvg('viewBox="0 0 10 10"', '<script>window.stolen = 1;</script><rect width="4" />'),
      XML,
    );

    expect(clean.querySelector('script')).toBeNull();
    expect(clean.documentElement.getAttribute('viewBox')).toBe('0 0 10 10');
  });

  it('empties a spine item whose root sits in a namespace the policy does not allow', () => {
    expect(sanitiseChapter('<data xmlns="http://example.com/ns"><item>一</item></data>', XML)).toBe(
      '',
    );
  });

  it('refuses a spine item whose root is not an element the policy knows', () => {
    expect(() => sanitiseChapter('<root><item>一</item></root>', XML)).toThrow(
      'root node is forbidden',
    );
  });

  it('keeps the camel-cased elements a standalone svg spine item paints with', () => {
    const clean = rendered(
      spineSvg(
        '',
        '<defs><linearGradient id="g"><stop offset="0" /></linearGradient><clipPath id="c"><rect width="5" height="5" /></clipPath><filter id="f"><feGaussianBlur stdDeviation="2" /></filter></defs><rect width="600" height="800" clip-path="url(#c)" fill="url(#g)" filter="url(#f)" />',
      ),
      SVG,
    );

    expect(clean.querySelector('linearGradient')).not.toBeNull();
    expect(clean.querySelector('clipPath')).not.toBeNull();
    expect(clean.querySelector('feGaussianBlur')?.getAttribute('stdDeviation')).toBe('2');
  });
});
