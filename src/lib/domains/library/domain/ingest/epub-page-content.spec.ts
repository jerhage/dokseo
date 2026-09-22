import { describe, expect, it } from 'vitest';
import { readPageContent } from './epub-page-content';

const PAGE = 'OEBPS/text/001.xhtml';

describe('readPageContent', () => {
  it('resolves a page that is one img against the page it sits in', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <html xmlns="http://www.w3.org/1999/xhtml">
        <head><title>Page 1</title></head>
        <body><img src="../images/001.jpg" alt=""/></body>
      </html>`;

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

  it('resolves a page that wraps its image in divs', () => {
    const xml = `<html><body><div class="page"><div class="frame">
      <img src="../images/001.jpg"/>
    </div></div></body></html>`;

    expect(readPageContent(xml, PAGE)).toEqual({
      kind: 'one-image',
      path: 'OEBPS/images/001.jpg',
    });
  });

  it('counts a page holding two images', () => {
    const xml = `<html><body>
      <img src="../images/001.jpg"/>
      <img src="../images/002.jpg"/>
    </body></html>`;

    expect(readPageContent(xml, PAGE)).toEqual({ kind: 'many-images', count: 2 });
  });

  it('counts an img beside an SVG image as two', () => {
    const xml = `<html><body>
      <img src="../images/001.jpg"/>
      <svg><image href="../images/002.jpg"/></svg>
    </body></html>`;

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

  it('shortens a long text to an excerpt', () => {
    const long = 'あ'.repeat(120);
    const xml = `<html><body><img src="001.jpg"/><p>${long}</p></body></html>`;

    const content = readPageContent(xml, PAGE);

    expect(content.kind).toBe('text-beside-the-image');
    expect(content.kind === 'text-beside-the-image' && content.text.length).toBe(49);
  });
});
