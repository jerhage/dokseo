import { describe, expect, it } from 'vitest';
import { resolveHref } from './epub-href';

describe('resolveHref', () => {
  it('resolves an href against the directory the base entry sits in', () => {
    expect(resolveHref('OEBPS/content.opf', 'text/001.xhtml')).toBe('OEBPS/text/001.xhtml');
  });

  it('resolves an href at the archive root when the base entry has no directory', () => {
    expect(resolveHref('content.opf', 'images/001.jpg')).toBe('images/001.jpg');
  });

  it('climbs out of the base directory for a dot-dot step', () => {
    expect(resolveHref('OEBPS/text/001.xhtml', '../images/001.jpg')).toBe('OEBPS/images/001.jpg');
  });

  it('climbs twice for two dot-dot steps', () => {
    expect(resolveHref('a/b/c/page.xhtml', '../../images/001.jpg')).toBe('a/images/001.jpg');
  });

  it('stops at the root rather than climbing past it', () => {
    expect(resolveHref('OEBPS/text/001.xhtml', '../../../../images/001.jpg')).toBe(
      'images/001.jpg',
    );
  });

  it('drops a single-dot step', () => {
    expect(resolveHref('OEBPS/content.opf', './text/./001.xhtml')).toBe('OEBPS/text/001.xhtml');
  });

  it('reads a leading slash as the archive root, not as a step inside the base directory', () => {
    expect(resolveHref('OEBPS/text/001.xhtml', '/images/001.jpg')).toBe('images/001.jpg');
  });

  it('decodes a percent-encoded name to the name the archive holds', () => {
    expect(resolveHref('OEBPS/content.opf', 'images/001%20a.jpg')).toBe('OEBPS/images/001 a.jpg');
    expect(resolveHref('OEBPS/content.opf', 'text/%E3%81%82.xhtml')).toBe('OEBPS/text/あ.xhtml');
  });

  it('decodes a percent-encoded dot-dot as a climb rather than as a name', () => {
    expect(resolveHref('OEBPS/text/001.xhtml', '%2E%2E/images/001.jpg')).toBe(
      'OEBPS/images/001.jpg',
    );
  });

  it('leaves a stray percent sign alone rather than failing', () => {
    expect(resolveHref('OEBPS/content.opf', 'images/100%.jpg')).toBe('OEBPS/images/100%.jpg');
  });

  it('drops the fragment an href points into', () => {
    expect(resolveHref('OEBPS/content.opf', 'text/001.xhtml#part2')).toBe('OEBPS/text/001.xhtml');
  });

  it('trims the surrounding space an attribute may carry', () => {
    expect(resolveHref('OEBPS/content.opf', '  text/001.xhtml  ')).toBe('OEBPS/text/001.xhtml');
  });

  it('returns nothing for an empty href or one that is only a fragment', () => {
    expect(resolveHref('OEBPS/content.opf', '')).toBe('');
    expect(resolveHref('OEBPS/content.opf', '#top')).toBe('');
  });
});
