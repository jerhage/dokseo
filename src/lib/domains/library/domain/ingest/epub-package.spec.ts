import { describe, expect, it } from 'vitest';
import { readEpubPackage } from './epub-package';

const FIXED_LAYOUT_JAPANESE = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid"
         prefix="rendition: http://www.idpf.org/vocab/rendition/#">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>吾輩は猫である</dc:title>
    <dc:language>ja</dc:language>
    <meta property="rendition:layout">pre-paginated</meta>
    <meta property="rendition:spread">landscape</meta>
  </metadata>
  <manifest>
    <item id="p1" href="page1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine page-progression-direction="rtl" toc="ncx">
    <itemref idref="p1"/>
  </spine>
</package>`;

const REFLOWABLE_PREFIXED = `<?xml version="1.0" encoding="UTF-8"?>
<opf:package unique-identifier="uid" version="3.0"
             xmlns:opf="http://www.idpf.org/2007/opf"
             xmlns:dc="http://purl.org/dc/elements/1.1/">
  <opf:metadata>
    <dc:language>en</dc:language>
    <dc:title>Flatland &amp; Sphereland</dc:title>
    <opf:meta refines="#uid" property="identifier-type">uuid</opf:meta>
    <opf:meta property="rendition:layout">reflowable</opf:meta>
  </opf:metadata>
  <opf:spine toc="ncx" page-progression-direction="ltr"/>
</opf:package>`;

const EPUB_TWO = `<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>
      Old Book
    </dc:title>
    <meta name="cover" content="cover-image"/>
  </metadata>
  <spine toc="ncx"/>
</package>`;

describe('readEpubPackage', () => {
  it('reads a fixed-layout Japanese book, right to left', () => {
    expect(readEpubPackage(FIXED_LAYOUT_JAPANESE)).toEqual({
      layout: 'pre-paginated',
      direction: 'rtl',
      title: '吾輩は猫である',
      language: 'ja',
    });
  });

  it('reads a reflowable book whose elements all carry a namespace prefix', () => {
    expect(readEpubPackage(REFLOWABLE_PREFIXED)).toEqual({
      layout: 'reflowable',
      direction: 'ltr',
      title: 'Flatland & Sphereland',
      language: 'en',
    });
  });

  it('calls a book with no rendition:layout reflowable', () => {
    expect(readEpubPackage(EPUB_TWO)?.layout).toBe('reflowable');
  });

  it('ignores a name-and-content meta, because the layout is a property and its text', () => {
    const named =
      '<package><metadata><meta name="rendition:layout" content="pre-paginated"/></metadata></package>';
    expect(readEpubPackage(named)?.layout).toBe('reflowable');
  });

  it('calls a spine with no page-progression-direction default', () => {
    expect(readEpubPackage(EPUB_TWO)?.direction).toBe('default');
    const spineless = '<package><metadata/></package>';
    expect(readEpubPackage(spineless)?.direction).toBe('default');
  });

  it('trims the title of the whitespace the markup gave it', () => {
    expect(readEpubPackage(EPUB_TWO)?.title).toBe('Old Book');
  });

  it('reports an absent title and an absent language as null', () => {
    const bare = '<package><metadata/><spine/></package>';
    expect(readEpubPackage(bare)).toEqual({
      layout: 'reflowable',
      direction: 'default',
      title: null,
      language: null,
    });
  });

  it('reports an empty title element as null rather than as an empty title', () => {
    const empty = '<package><metadata><dc:title>  </dc:title></metadata></package>';
    expect(readEpubPackage(empty)?.title).toBe(null);
  });

  it('calls an unrecognised rendition:layout value reflowable', () => {
    const scrolled =
      '<package><metadata><meta property="rendition:layout">scrolled</meta></metadata></package>';
    expect(readEpubPackage(scrolled)?.layout).toBe('reflowable');
  });

  it('reads the direction whatever case it was written in', () => {
    const shouted = '<package><metadata/><spine page-progression-direction="RTL"/></package>';
    expect(readEpubPackage(shouted)?.direction).toBe('rtl');
  });

  it('returns null for a document whose root is not a package', () => {
    expect(readEpubPackage('<container><rootfiles/></container>')).toBe(null);
    expect(readEpubPackage('')).toBe(null);
  });
});
