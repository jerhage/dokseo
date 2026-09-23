import { describe, expect, it } from 'vitest';
import { MAX_MARKUP_BYTES } from './ingest-limits';
import { attributeOf, descendantsNamed, firstNamed, parseXml } from './xml-document';
import type { XmlElement } from './xml-document';

function parsed(xml: string): XmlElement {
  const root = parseXml(xml);
  if (root === null) throw new Error(`no element in ${xml}`);
  return root;
}

describe('parseXml', () => {
  it('returns null for text holding no element', () => {
    expect(parseXml('   ')).toBe(null);
    expect(parseXml('<?xml version="1.0"?>')).toBe(null);
  });

  it('reads the root element under both its qualified and its local name', () => {
    const root = parsed('<opf:package xmlns:opf="http://www.idpf.org/2007/opf"/>');
    expect(root.name).toBe('opf:package');
    expect(root.localName).toBe('package');
  });

  it('reads attributes quoted either way, in any order', () => {
    const root = parsed(`<spine toc='ncx' page-progression-direction="rtl"></spine>`);
    expect(attributeOf(root, 'page-progression-direction')).toBe('rtl');
    expect(attributeOf(root, 'toc')).toBe('ncx');
  });

  it('matches an attribute by its local name, whatever prefix it carries', () => {
    const root = parsed('<item xml:lang="ja" opf:role="aut"/>');
    expect(attributeOf(root, 'lang')).toBe('ja');
    expect(attributeOf(root, 'role')).toBe('aut');
  });

  it('returns null for an attribute the element does not carry', () => {
    expect(attributeOf(parsed('<spine/>'), 'page-progression-direction')).toBe(null);
  });

  it('decodes the five named references and numeric ones, in text and in attributes', () => {
    const root = parsed('<t a="&lt;&amp;&gt;&quot;&apos;">&#x3042;&#12356;</t>');
    expect(root.text).toBe('あい');
    expect(attributeOf(root, 'a')).toBe(`<&>"'`);
  });

  it('leaves an unknown reference exactly as written', () => {
    expect(parsed('<t>&nbsp;x</t>').text).toBe('&nbsp;x');
  });

  it('skips a comment, a processing instruction and a doctype with an internal subset', () => {
    const xml = [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<!DOCTYPE html [ <!ENTITY nb "&#160;"> ]>',
      '<!-- <package/> is not the root -->',
      '<html><body>text</body></html>',
    ].join('\n');
    const root = parsed(xml);
    expect(root.localName).toBe('html');
    expect(firstNamed(root, 'body')?.text).toBe('text');
  });

  it('keeps CDATA text undecoded', () => {
    expect(parsed('<t><![CDATA[a & <b>]]></t>').text).toBe('a & <b>');
  });

  it('nests children and keeps only the direct text of each element', () => {
    const root = parsed('<a>one<b>two</b>three</a>');
    expect(root.text).toBe('onethree');
    expect(firstNamed(root, 'b')?.text).toBe('two');
  });

  it('collects descendants at any depth, in document order', () => {
    const root = parsed('<m><a id="1"/><w><a id="2"/></w><a id="3"/></m>');
    const found = descendantsNamed(root, 'a').map((element) => attributeOf(element, 'id'));
    expect(found).toEqual(['1', '2', '3']);
  });

  it('closes an element the document left open', () => {
    const root = parsed('<a><b>two');
    expect(root.localName).toBe('a');
    expect(firstNamed(root, 'b')?.text).toBe('two');
  });

  it('returns the first top-level element when the document holds several', () => {
    expect(parsed('<a/><b/>').localName).toBe('a');
  });
});

describe('descendantsNamed against a deeply nested document', () => {
  const DEPTH = 50_000;

  it('reads a document nested deeper than the call stack, because a reader chose the file', () => {
    const source = `<root>${'<a>'.repeat(DEPTH)}<needle/>${'</a>'.repeat(DEPTH)}</root>`;
    const document = parseXml(source);

    expect(document).not.toBeNull();
    expect(document === null ? 0 : descendantsNamed(document, 'needle').length).toBe(1);
  });
});

describe('parseXml against a document longer than the markup limit', () => {
  it('reads a document whose length sits exactly on the limit', () => {
    const padding = '\u3042'.repeat(MAX_MARKUP_BYTES - '<p></p>'.length);
    const source = `<p>${padding}</p>`;

    expect(source.length).toBe(MAX_MARKUP_BYTES);
    expect(parseXml(source)?.localName).toBe('p');
  });

  it('refuses a document one character over the limit, before scanning it', () => {
    const padding = '\u3042'.repeat(MAX_MARKUP_BYTES - '<p></p>'.length + 1);

    expect(parseXml(`<p>${padding}</p>`)).toBeNull();
  });
});
