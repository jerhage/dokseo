import { describe, expect, it } from 'vitest';
import { readEpubCover } from './epub-cover';

const EPUB_3 = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata><dc:title>A novel</dc:title></metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="art" href="images/cover.png" media-type="image/png" properties="cover-image"/>
    <item id="ch1" href="text/ch01.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine><itemref idref="ch1"/></spine>
</package>`;

const EPUB_2 = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata>
    <dc:title>An older novel</dc:title>
    <meta name="cover" content="art"/>
  </metadata>
  <manifest>
    <item id="art" href="images/front.jpeg" media-type="image/jpeg"/>
    <item id="ch1" href="text/ch01.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine><itemref idref="ch1"/></spine>
</package>`;

describe('readEpubCover', () => {
  it('reads the EPUB 3 manifest item marked cover-image', () => {
    expect(readEpubCover(EPUB_3, 'OEBPS/content.opf')).toEqual({
      path: 'OEBPS/images/cover.png',
      mediaType: 'image/png',
    });
  });

  it('reads the EPUB 2 meta named cover through the manifest id it points at', () => {
    expect(readEpubCover(EPUB_2, 'OEBPS/content.opf')).toEqual({
      path: 'OEBPS/images/front.jpeg',
      mediaType: 'image/jpeg',
    });
  });

  it('takes the marked item when a hybrid book carries both conventions', () => {
    const xml = `<package>
        <metadata><meta name="cover" content="old"/></metadata>
        <manifest>
          <item id="old" href="legacy.jpg" media-type="image/jpeg"/>
          <item id="new" href="cover.png" media-type="image/png" properties="cover-image"/>
        </manifest>
      </package>`;

    expect(readEpubCover(xml, 'content.opf')).toEqual({
      path: 'cover.png',
      mediaType: 'image/png',
    });
  });

  it('reads cover-image as one entry among several properties', () => {
    const xml = `<package><manifest>
        <item id="c" href="c.png" media-type="image/png" properties="svg scripted cover-image"/>
      </manifest></package>`;

    expect(readEpubCover(xml, 'content.opf')).toEqual({ path: 'c.png', mediaType: 'image/png' });
  });

  it('refuses a property whose name merely contains cover-image', () => {
    const xml = `<package><manifest>
        <item id="c" href="c.png" media-type="image/png" properties="not-cover-image"/>
      </manifest></package>`;

    expect(readEpubCover(xml, 'content.opf')).toBeNull();
  });

  it('names no cover when a book declares neither convention', () => {
    const xml = `<package><manifest>
        <item id="ch1" href="ch01.xhtml" media-type="application/xhtml+xml"/>
        <item id="art" href="images/plate.png" media-type="image/png"/>
      </manifest><spine><itemref idref="ch1"/></spine></package>`;

    expect(readEpubCover(xml, 'content.opf')).toBeNull();
  });

  it('names no cover when the meta points at an id the manifest does not list', () => {
    const xml = `<package>
        <metadata><meta name="cover" content="missing"/></metadata>
        <manifest><item id="art" href="c.png" media-type="image/png"/></manifest>
      </package>`;

    expect(readEpubCover(xml, 'content.opf')).toBeNull();
  });

  it('refuses a meta that points at the cover page rather than the cover image', () => {
    const xml = `<package>
        <metadata><meta name="cover" content="page"/></metadata>
        <manifest>
          <item id="page" href="text/cover.xhtml" media-type="application/xhtml+xml"/>
        </manifest>
      </package>`;

    expect(readEpubCover(xml, 'content.opf')).toBeNull();
  });

  it('refuses a marked item that declares no media type', () => {
    const xml = `<package><manifest>
        <item id="c" href="c.png" properties="cover-image"/>
      </manifest></package>`;

    expect(readEpubCover(xml, 'content.opf')).toBeNull();
  });

  it('falls back to the meta when the marked item carries no href', () => {
    const xml = `<package>
        <metadata><meta name="cover" content="old"/></metadata>
        <manifest>
          <item id="new" href="" media-type="image/png" properties="cover-image"/>
          <item id="old" href="legacy.jpg" media-type="image/jpeg"/>
        </manifest>
      </package>`;

    expect(readEpubCover(xml, 'content.opf')).toEqual({
      path: 'legacy.jpg',
      mediaType: 'image/jpeg',
    });
  });

  it('resolves the href against the directory the package document sits in', () => {
    const xml = `<package><manifest>
        <item id="c" href="../art/%E8%A1%A8%E7%B4%99.png" media-type="image/png"
              properties="cover-image"/>
      </manifest></package>`;

    expect(readEpubCover(xml, 'OEBPS/package/content.opf')).toEqual({
      path: 'OEBPS/art/表紙.png',
      mediaType: 'image/png',
    });
  });

  it('reads a namespace-prefixed package whose meta carries the attributes in the other order', () => {
    const xml = `<opf:package xmlns:opf="http://www.idpf.org/2007/opf">
        <opf:metadata><opf:meta content="art" name="cover"/></opf:metadata>
        <opf:manifest><opf:item media-type="image/gif" href="c.gif" id="art"/></opf:manifest>
      </opf:package>`;

    expect(readEpubCover(xml, 'content.opf')).toEqual({ path: 'c.gif', mediaType: 'image/gif' });
  });

  it('keeps an SVG cover, which is a legal cover image', () => {
    const xml = `<package><manifest>
        <item id="c" href="cover.svg" media-type="image/svg+xml" properties="cover-image"/>
      </manifest></package>`;

    expect(readEpubCover(xml, 'content.opf')).toEqual({
      path: 'cover.svg',
      mediaType: 'image/svg+xml',
    });
  });

  it('names no cover in a document that is not a package', () => {
    expect(readEpubCover('<html><body>not a package</body></html>', 'content.opf')).toBeNull();
    expect(readEpubCover('', 'content.opf')).toBeNull();
  });
});
