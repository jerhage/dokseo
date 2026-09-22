import { describe, expect, it } from 'vitest';
import { readEpubSpine } from './epub-spine';

const OUT_OF_ORDER = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <manifest>
    <item id="c" href="text/003.xhtml" media-type="application/xhtml+xml"/>
    <item id="a" href="text/001.xhtml" media-type="application/xhtml+xml"/>
    <item id="b" href="text/002.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine page-progression-direction="rtl">
    <itemref idref="b"/>
    <itemref idref="c"/>
    <itemref idref="a"/>
  </spine>
</package>`;

describe('readEpubSpine', () => {
  it('orders the pages the way the spine lists them, not the way the manifest or the filenames do', () => {
    expect(readEpubSpine(OUT_OF_ORDER, 'OEBPS/content.opf')).toEqual({
      kind: 'spine',
      paths: ['OEBPS/text/002.xhtml', 'OEBPS/text/003.xhtml', 'OEBPS/text/001.xhtml'],
    });
  });

  it('resolves a manifest href against the directory the package document sits in', () => {
    const xml = `<package><manifest>
        <item id="p1" href="../shared/001.xhtml"/>
      </manifest><spine><itemref idref="p1"/></spine></package>`;

    expect(readEpubSpine(xml, 'OEBPS/package/content.opf')).toEqual({
      kind: 'spine',
      paths: ['OEBPS/shared/001.xhtml'],
    });
  });

  it('reads a namespace-prefixed package with the attributes in the other order', () => {
    const xml = `<opf:package xmlns:opf="http://www.idpf.org/2007/opf">
        <opf:manifest><opf:item href="p.xhtml" id="p1"/></opf:manifest>
        <opf:spine><opf:itemref linear="yes" idref="p1"/></opf:spine>
      </opf:package>`;

    expect(readEpubSpine(xml, 'content.opf')).toEqual({ kind: 'spine', paths: ['p.xhtml'] });
  });

  it('names the idref the manifest does not list', () => {
    const xml = `<package><manifest><item id="p1" href="p1.xhtml"/></manifest>
      <spine><itemref idref="p1"/><itemref idref="p2"/></spine></package>`;

    expect(readEpubSpine(xml, 'content.opf')).toEqual({ kind: 'unmanifested', idref: 'p2' });
  });

  it('names an idref whose manifest item carries no href', () => {
    const xml = `<package><manifest><item id="p1" href=""/></manifest>
      <spine><itemref idref="p1"/></spine></package>`;

    expect(readEpubSpine(xml, 'content.opf')).toEqual({ kind: 'unmanifested', idref: 'p1' });
  });

  it('reports an empty spine', () => {
    const xml = '<package><manifest/><spine/></package>';

    expect(readEpubSpine(xml, 'content.opf')).toEqual({ kind: 'empty' });
  });

  it('reports a package document with no spine as unreadable', () => {
    const xml = '<package><manifest><item id="p1" href="p1.xhtml"/></manifest></package>';

    expect(readEpubSpine(xml, 'content.opf')).toEqual({ kind: 'unreadable' });
  });

  it('reports text that holds no package element as unreadable', () => {
    expect(readEpubSpine('', 'content.opf')).toEqual({ kind: 'unreadable' });
    expect(readEpubSpine('<html><body/></html>', 'content.opf')).toEqual({ kind: 'unreadable' });
  });

  it('decodes a percent-encoded manifest href to the name the archive holds', () => {
    const xml = `<package><manifest><item id="p1" href="text/%E3%81%82.xhtml"/></manifest>
      <spine><itemref idref="p1"/></spine></package>`;

    expect(readEpubSpine(xml, 'OEBPS/content.opf')).toEqual({
      kind: 'spine',
      paths: ['OEBPS/text/あ.xhtml'],
    });
  });

  it('skips an itemref that names no idref', () => {
    const xml = `<package><manifest><item id="p1" href="p1.xhtml"/></manifest>
      <spine><itemref/><itemref idref="p1"/></spine></package>`;

    expect(readEpubSpine(xml, 'content.opf')).toEqual({ kind: 'spine', paths: ['p1.xhtml'] });
  });
});
