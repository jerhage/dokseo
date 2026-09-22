import { describe, expect, it } from 'vitest';
import { packagePathFromContainer } from './epub-container';

const PLAIN = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

const PREFIXED = `<?xml version="1.0" encoding="UTF-8"?>
<ocf:container xmlns:ocf="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <ocf:rootfiles>
    <ocf:rootfile media-type="application/oebps-package+xml"
                  full-path="item/standard.opf"/>
  </ocf:rootfiles>
</ocf:container>`;

describe('packagePathFromContainer', () => {
  it('reads the package path out of the rootfile', () => {
    expect(packagePathFromContainer(PLAIN)).toBe('OEBPS/content.opf');
  });

  it('reads a namespace-prefixed container with the attributes in the other order', () => {
    expect(packagePathFromContainer(PREFIXED)).toBe('item/standard.opf');
  });

  it('keeps the subdirectory the package sits in', () => {
    const xml =
      '<container><rootfiles><rootfile full-path="a/b/c/book.opf"/></rootfiles></container>';
    expect(packagePathFromContainer(xml)).toBe('a/b/c/book.opf');
  });

  it('strips a leading slash or dot-slash from the path', () => {
    const rooted = '<container><rootfile full-path="/OEBPS/content.opf"/></container>';
    const relative = '<container><rootfile full-path="./content.opf"/></container>';
    expect(packagePathFromContainer(rooted)).toBe('OEBPS/content.opf');
    expect(packagePathFromContainer(relative)).toBe('content.opf');
  });

  it('decodes an escaped path', () => {
    const xml = '<container><rootfile full-path="OEBPS/a&amp;b.opf"/></container>';
    expect(packagePathFromContainer(xml)).toBe('OEBPS/a&b.opf');
  });

  it('skips a rootfile of another media type and takes the package one', () => {
    const xml = `<container><rootfiles>
      <rootfile full-path="META-INF/signatures.xml" media-type="application/xml"/>
      <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
    </rootfiles></container>`;
    expect(packagePathFromContainer(xml)).toBe('OEBPS/content.opf');
  });

  it('returns null when no rootfile names a path', () => {
    expect(packagePathFromContainer('<container><rootfiles/></container>')).toBe(null);
    expect(packagePathFromContainer('<container><rootfile full-path=""/></container>')).toBe(null);
  });

  it('returns null for text that holds no element at all', () => {
    expect(packagePathFromContainer('')).toBe(null);
    expect(packagePathFromContainer('not xml')).toBe(null);
  });
});
