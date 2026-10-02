import { describe, expect, it, vi } from 'vitest';
import { sanitiseChapters, sanitiseResource, treatmentOf } from './chapter-transform';
import type { Transformable } from './chapter-transform';
import type { ResourceDetail, ResourceEvent } from 'foliate-js/view.js';

const XHTML = 'application/xhtml+xml';

const HTML = 'text/html';

const SVG = 'image/svg+xml';

const XML = 'application/xml';

const TEXT_XML = 'text/xml';

const CSS = 'text/css';

const DECLARED_XHTML = 'Application/XHTML+XML';

const DECLARED_HTML = 'Text/HTML';

const DECLARED_SVG = 'Image/SVG+XML';

const CHAPTER = '<html xmlns="http://www.w3.org/1999/xhtml"><body><p>ページ</p></body></html>';

const COVER = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800"/>';

function resource(type: string, data: ResourceDetail['data']): ResourceDetail {
  return { data, type, name: 'OEBPS/chapter-1.xhtml' };
}

function cleaned(marker: string): (markup: string) => string {
  return (markup) => `${marker}${markup}`;
}

type Shelf = {
  readonly book: Transformable;
  readonly listened: string[];
  hand: (detail: ResourceDetail) => void;
};

function shelf(): Shelf {
  const listeners: ((event: ResourceEvent) => void)[] = [];
  const listened: string[] = [];

  return {
    book: {
      transformTarget: {
        addEventListener: (type, listener) => {
          listened.push(type);
          listeners.push(listener);
        },
      },
    },
    listened,
    hand: (detail) => {
      for (const listener of listeners) listener({ detail });
    },
  };
}

describe('treatmentOf', () => {
  it.each([
    [XHTML, XHTML],
    [HTML, HTML],
    [SVG, SVG],
    [XML, XML],
    [TEXT_XML, TEXT_XML],
    [DECLARED_XHTML, XHTML],
    [DECLARED_HTML, HTML],
    [DECLARED_SVG, SVG],
    ['APPLICATION/XHTML+XML', XHTML],
    ['Application/XML; charset=utf-8', XML],
    ['application/xhtml+xml; charset=utf-8', XHTML],
    ['text/html;charset=UTF-8', HTML],
    ['image/svg+xml ;charset=utf-8', SVG],
    [' application/xhtml+xml ', XHTML],
    ['\ttext/html\n', HTML],
    [' Application/XHTML+XML ; charset=UTF-8 ', XHTML],
  ])('names %j as markup to sanitise, in the spelling a parser accepts', (declared, mediaType) => {
    expect(treatmentOf(declared)).toEqual({ kind: 'markup', mediaType });
  });

  it.each([
    CSS,
    'image/jpeg',
    'image/png',
    'font/woff2',
    '',
    'Text/CSS',
    'Image/JPEG',
    'IMAGE/PNG',
    'Font/WOFF2',
    'application/x-dtbncx+xml',
    'application/smil+xml',
    'text/xsl',
    'text/plain; charset=utf-8',
    'application/octet-stream',
  ])('leaves %j opaque', (declared) => {
    expect(treatmentOf(declared)).toEqual({ kind: 'opaque' });
  });
});

describe('sanitiseResource', () => {
  it.each([
    [XHTML, 'string', CHAPTER, XHTML],
    [SVG, 'string', COVER, SVG],
    [DECLARED_HTML, 'string', CHAPTER, HTML],
    [XHTML, 'blob', CHAPTER, XHTML],
    [DECLARED_XHTML, 'blob', CHAPTER, XHTML],
    [DECLARED_SVG, 'blob', COVER, SVG],
    ['application/xhtml+xml; charset=utf-8', 'blob', CHAPTER, XHTML],
    [XML, 'blob', CHAPTER, XML],
  ] as const)(
    'replaces %j markup arriving as a %s with its sanitised markup',
    async (declared, arrival, markup, mediaType) => {
      const data = arrival === 'string' ? markup : Promise.resolve(new Blob([markup]));
      const detail = resource(declared, data);
      const sanitise = vi.fn(cleaned('clean:'));

      sanitiseResource(detail, sanitise);

      await expect(detail.data).resolves.toBe(`clean:${markup}`);
      expect(sanitise).toHaveBeenCalledWith(markup, mediaType);
    },
  );

  it('tells the sanitiser which markup type foliate settled on', async () => {
    const sanitise = vi.fn(() => CHAPTER);

    sanitiseResource(resource(HTML, CHAPTER), sanitise);
    await Promise.resolve();

    expect(sanitise).toHaveBeenCalledWith(CHAPTER, HTML);
  });

  it.each([
    [CSS, 'body { font-family: "Hiragino Mincho"; }'],
    ['Text/CSS', 'body { font-family: "Hiragino Mincho"; }'],
    ['image/jpeg', Promise.resolve(new Blob(['cover']))],
    ['Image/PNG', Promise.resolve(new Blob(['cover']))],
    ['font/woff2', Promise.resolve(new Blob(['mincho']))],
    ['Font/WOFF2', Promise.resolve(new Blob(['mincho']))],
  ])('hands %j back as the very data foliate is loading, unparsed', (declared, data) => {
    const detail = resource(declared, data);
    const sanitise = vi.fn(() => '');

    sanitiseResource(detail, sanitise);

    expect(detail.data).toBe(data);
    expect(sanitise).not.toHaveBeenCalled();
  });

  it('passes on the failure of a chapter foliate could not read', async () => {
    const unreadable = new Error('the zip entry is missing');
    const detail = resource(XHTML, Promise.reject(unreadable));
    const sanitise = vi.fn(() => '');

    sanitiseResource(detail, sanitise);

    await expect(detail.data).rejects.toBe(unreadable);
    expect(sanitise).not.toHaveBeenCalled();
  });
});

describe('sanitiseChapters', () => {
  it('sanitises every chapter the book hands out', async () => {
    const { book, hand } = shelf();
    const first = resource(XHTML, CHAPTER);
    const second = resource(HTML, CHAPTER);

    sanitiseChapters(book, cleaned('clean:'));
    hand(first);
    hand(second);

    await expect(first.data).resolves.toBe(`clean:${CHAPTER}`);
    await expect(second.data).resolves.toBe(`clean:${CHAPTER}`);
  });

  it('listens for the resource event foliate fires before it mints a blob url', () => {
    const { book, listened } = shelf();

    sanitiseChapters(book, cleaned('clean:'));

    expect(listened).toEqual(['data']);
  });
});
