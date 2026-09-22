import { describe, expect, it, vi } from 'vitest';
import { sanitiseChapters, sanitiseResource, treatmentOf } from './chapter-transform';
import type { Transformable } from './chapter-transform';
import type { ResourceDetail, ResourceEvent } from 'foliate-js/view.js';

const XHTML = 'application/xhtml+xml';

const HTML = 'text/html';

const SVG = 'image/svg+xml';

const CSS = 'text/css';

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
  it('names an xhtml resource as markup to sanitise', () => {
    expect(treatmentOf(XHTML)).toEqual({ kind: 'markup', mediaType: XHTML });
  });

  it('names the html a chapter falls back to as markup to sanitise', () => {
    expect(treatmentOf(HTML)).toEqual({ kind: 'markup', mediaType: HTML });
  });

  it('names a standalone svg spine item as markup to sanitise', () => {
    expect(treatmentOf(SVG)).toEqual({ kind: 'markup', mediaType: SVG });
  });

  it('leaves a stylesheet, an image and a font opaque', () => {
    for (const type of [CSS, 'image/jpeg', 'image/png', 'font/woff2', '']) {
      expect(treatmentOf(type)).toEqual({ kind: 'opaque' });
    }
  });
});

describe('sanitiseResource', () => {
  it('replaces a chapter with its sanitised markup', async () => {
    const detail = resource(XHTML, CHAPTER);

    sanitiseResource(detail, cleaned('clean:'));

    await expect(detail.data).resolves.toBe(`clean:${CHAPTER}`);
  });

  it('replaces a standalone svg spine item with its sanitised markup', async () => {
    const detail = resource(SVG, COVER);

    sanitiseResource(detail, cleaned('clean:'));

    await expect(detail.data).resolves.toBe(`clean:${COVER}`);
  });

  it('tells the sanitiser which markup type foliate settled on', async () => {
    const sanitise = vi.fn(() => CHAPTER);

    sanitiseResource(resource(HTML, CHAPTER), sanitise);
    await Promise.resolve();

    expect(sanitise).toHaveBeenCalledWith(CHAPTER, HTML);
  });

  it('hands a stylesheet back byte for byte, unparsed', () => {
    const sheet = 'body { font-family: "Hiragino Mincho"; }';
    const detail = resource(CSS, sheet);
    const sanitise = vi.fn(() => '');

    sanitiseResource(detail, sanitise);

    expect(detail.data).toBe(sheet);
    expect(sanitise).not.toHaveBeenCalled();
  });

  it('hands an image back as the very promise foliate is loading', () => {
    const loading = Promise.resolve(new Blob(['cover']));
    const detail = resource('image/jpeg', loading);
    const sanitise = vi.fn(() => '');

    sanitiseResource(detail, sanitise);

    expect(detail.data).toBe(loading);
    expect(sanitise).not.toHaveBeenCalled();
  });

  it('hands a font back as the very promise foliate is loading', () => {
    const loading = Promise.resolve(new Blob(['mincho']));
    const detail = resource('font/woff2', loading);
    const sanitise = vi.fn(() => '');

    sanitiseResource(detail, sanitise);

    expect(detail.data).toBe(loading);
    expect(sanitise).not.toHaveBeenCalled();
  });

  it('leaves a chapter that arrives as a blob alone', async () => {
    const cover = new Blob(['cover']);
    const detail = resource(XHTML, Promise.resolve(cover));
    const sanitise = vi.fn(() => '');

    sanitiseResource(detail, sanitise);

    await expect(detail.data).resolves.toBe(cover);
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
