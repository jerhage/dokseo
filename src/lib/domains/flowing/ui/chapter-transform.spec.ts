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

  it('names a chapter a book declared in mixed case as markup to sanitise', () => {
    expect(treatmentOf(DECLARED_XHTML)).toEqual({ kind: 'markup', mediaType: XHTML });
    expect(treatmentOf(DECLARED_HTML)).toEqual({ kind: 'markup', mediaType: HTML });
    expect(treatmentOf(DECLARED_SVG)).toEqual({ kind: 'markup', mediaType: SVG });
  });

  it('answers with the media type a parser accepts, not the one the book spelled', () => {
    const treatment = treatmentOf('APPLICATION/XHTML+XML');

    expect(treatment).toEqual({ kind: 'markup', mediaType: XHTML });
  });

  it('leaves a stylesheet, an image and a font opaque in mixed case too', () => {
    for (const type of ['Text/CSS', 'Image/JPEG', 'IMAGE/PNG', 'Font/WOFF2']) {
      expect(treatmentOf(type)).toEqual({ kind: 'opaque' });
    }
  });

  it('names a chapter whose media type carries a charset as markup to sanitise', () => {
    expect(treatmentOf('application/xhtml+xml; charset=utf-8')).toEqual({
      kind: 'markup',
      mediaType: XHTML,
    });
    expect(treatmentOf('text/html;charset=UTF-8')).toEqual({ kind: 'markup', mediaType: HTML });
    expect(treatmentOf('image/svg+xml ;charset=utf-8')).toEqual({ kind: 'markup', mediaType: SVG });
  });

  it('names a media type padded with whitespace as markup to sanitise', () => {
    expect(treatmentOf(' application/xhtml+xml ')).toEqual({ kind: 'markup', mediaType: XHTML });
    expect(treatmentOf('\ttext/html\n')).toEqual({ kind: 'markup', mediaType: HTML });
  });

  it('names a media type mis-cased, padded and parameterised at once as markup', () => {
    expect(treatmentOf(' Application/XHTML+XML ; charset=UTF-8 ')).toEqual({
      kind: 'markup',
      mediaType: XHTML,
    });
  });

  it('names an xml spine item as markup to sanitise', () => {
    expect(treatmentOf(XML)).toEqual({ kind: 'markup', mediaType: XML });
    expect(treatmentOf(TEXT_XML)).toEqual({ kind: 'markup', mediaType: TEXT_XML });
    expect(treatmentOf('Application/XML; charset=utf-8')).toEqual({
      kind: 'markup',
      mediaType: XML,
    });
  });

  it('leaves the navigation and media overlay types a book declares opaque', () => {
    for (const type of ['application/x-dtbncx+xml', 'application/smil+xml', 'text/xsl']) {
      expect(treatmentOf(type)).toEqual({ kind: 'opaque' });
    }
  });

  it('leaves a media type a browser renders as something other than markup opaque', () => {
    for (const type of ['text/plain; charset=utf-8', 'application/octet-stream']) {
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

  it('replaces a chapter that arrives as a blob with its sanitised markup', async () => {
    const detail = resource(XHTML, Promise.resolve(new Blob([CHAPTER])));

    sanitiseResource(detail, cleaned('clean:'));

    await expect(detail.data).resolves.toBe(`clean:${CHAPTER}`);
  });

  it('reads a chapter foliate never rewrote out of its blob and sanitises it', async () => {
    const detail = resource(DECLARED_XHTML, Promise.resolve(new Blob([CHAPTER])));
    const sanitise = vi.fn(() => 'clean');

    sanitiseResource(detail, sanitise);

    await expect(detail.data).resolves.toBe('clean');
    expect(sanitise).toHaveBeenCalledWith(CHAPTER, XHTML);
  });

  it('hands foliate back a string it can put in a blob of its own', async () => {
    const detail = resource(DECLARED_SVG, Promise.resolve(new Blob([COVER])));

    sanitiseResource(detail, cleaned('clean:'));

    expect(typeof (await detail.data)).toBe('string');
  });

  it('replaces a chapter a book declared in mixed case with its sanitised markup', async () => {
    const detail = resource(DECLARED_HTML, CHAPTER);

    sanitiseResource(detail, cleaned('clean:'));

    await expect(detail.data).resolves.toBe(`clean:${CHAPTER}`);
  });

  it('hands a mis-cased stylesheet, image and font back untouched', () => {
    const sheet = 'body { font-family: "Hiragino Mincho"; }';
    const picture = Promise.resolve(new Blob(['cover']));
    const font = Promise.resolve(new Blob(['mincho']));
    const sanitise = vi.fn(() => '');
    const styled = resource('Text/CSS', sheet);
    const pictured = resource('Image/PNG', picture);
    const lettered = resource('Font/WOFF2', font);

    sanitiseResource(styled, sanitise);
    sanitiseResource(pictured, sanitise);
    sanitiseResource(lettered, sanitise);

    expect(styled.data).toBe(sheet);
    expect(pictured.data).toBe(picture);
    expect(lettered.data).toBe(font);
    expect(sanitise).not.toHaveBeenCalled();
  });

  it('reads a chapter whose media type carries a charset out of its blob', async () => {
    const detail = resource(
      'application/xhtml+xml; charset=utf-8',
      Promise.resolve(new Blob([CHAPTER])),
    );
    const sanitise = vi.fn(() => 'clean');

    sanitiseResource(detail, sanitise);

    await expect(detail.data).resolves.toBe('clean');
    expect(sanitise).toHaveBeenCalledWith(CHAPTER, XHTML);
  });

  it('reads an xml spine item out of its blob and sanitises it', async () => {
    const detail = resource(XML, Promise.resolve(new Blob([CHAPTER])));
    const sanitise = vi.fn(() => 'clean');

    sanitiseResource(detail, sanitise);

    await expect(detail.data).resolves.toBe('clean');
    expect(sanitise).toHaveBeenCalledWith(CHAPTER, XML);
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
