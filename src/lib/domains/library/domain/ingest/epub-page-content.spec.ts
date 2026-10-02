import { describe, expect, it } from 'vitest';
import { readPageContent } from './epub-page-content';

const PAGE = 'OEBPS/text/001.xhtml';

describe('readPageContent', () => {
  it.each([
    [
      'is one img',
      `<?xml version="1.0" encoding="UTF-8"?>
      <html xmlns="http://www.w3.org/1999/xhtml">
        <head><title>Page 1</title></head>
        <body><img src="../images/001.jpg" alt=""/></body>
      </html>`,
    ],
    [
      'wraps its image in divs',
      `<html><body><div class="page"><div class="frame">
      <img src="../images/001.jpg"/>
    </div></div></body></html>`,
    ],
  ])('resolves a page that %s against the page it sits in', (_, xml) => {
    expect(readPageContent(xml, PAGE)).toEqual({
      kind: 'one-image',
      path: 'OEBPS/images/001.jpg',
    });
  });

  it('resolves a page that is an SVG image through its xlink href', () => {
    const xml = `<html xmlns="http://www.w3.org/1999/xhtml">
      <body>
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
             viewBox="0 0 1200 1700">
          <image width="1200" height="1700" xlink:href="../images/001.jpg"/>
        </svg>
      </body></html>`;

    expect(readPageContent(xml, PAGE)).toEqual({
      kind: 'one-image',
      path: 'OEBPS/images/001.jpg',
    });
  });

  it.each([
    [
      'two imgs',
      `<html><body>
      <img src="../images/001.jpg"/>
      <img src="../images/002.jpg"/>
    </body></html>`,
    ],
    [
      'an img beside an SVG image',
      `<html><body>
      <img src="../images/001.jpg"/>
      <svg><image href="../images/002.jpg"/></svg>
    </body></html>`,
    ],
  ])('counts a page holding %s as two images', (_, xml) => {
    expect(readPageContent(xml, PAGE)).toEqual({ kind: 'many-images', count: 2 });
  });

  it('reports the text a page holds beside its image', () => {
    const xml = `<html><head><title>Page 1</title></head><body>
      <img src="../images/001.jpg"/>
      <p>第一話　はじまり</p>
    </body></html>`;

    expect(readPageContent(xml, PAGE)).toEqual({
      kind: 'text-beside-the-image',
      path: 'OEBPS/images/001.jpg',
      text: '第一話 はじまり',
    });
  });

  it('reads the head title and a stylesheet as no text at all', () => {
    const xml = `<html><head>
        <title>Page 1</title>
        <style>body { margin: 0 }</style>
      </head><body>
        <img src="../images/001.jpg"/>
      </body></html>`;

    expect(readPageContent(xml, PAGE)).toEqual({
      kind: 'one-image',
      path: 'OEBPS/images/001.jpg',
    });
  });

  it('reports a page holding no image', () => {
    const xml = '<html><body><p>Copyright</p></body></html>';

    expect(readPageContent(xml, PAGE)).toEqual({ kind: 'no-image' });
  });

  it('reports an img carrying no src as no image', () => {
    expect(readPageContent('<html><body><img alt=""/></body></html>', PAGE)).toEqual({
      kind: 'no-image',
    });
  });

  it.each([
    ['あ'.repeat(120), `${'あ'.repeat(48)}…`],
    [`${'あ'.repeat(47)} ${'い'.repeat(60)}`, `${'あ'.repeat(47)}…`],
  ])('shortens a long text to an excerpt, trimming a space at the cut', (long, excerpt) => {
    const xml = `<html><body><img src="001.jpg"/><p>${long}</p></body></html>`;

    expect(readPageContent(xml, PAGE)).toEqual({
      kind: 'text-beside-the-image',
      path: 'OEBPS/text/001.jpg',
      text: excerpt,
    });
  });
});
