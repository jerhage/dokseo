import { describe, expect, it } from 'vitest';
import { sectionHref } from '../security-headers/sections';
import {
  EPUB_SECTIONS,
  SECURITY_CHAPTERS_HREF,
  SECURITY_INHERIT_HREF,
  SECURITY_WEBKIT_HREF,
} from './epub-sections';

describe('the EPUB page sections', () => {
  it('links to anchors the security headers page has', () => {
    expect(SECURITY_CHAPTERS_HREF).toBe(`/docs/security-headers${sectionHref('chapters')}`);
    expect(SECURITY_INHERIT_HREF).toBe(`/docs/security-headers${sectionHref('frames')}`);
    expect(SECURITY_WEBKIT_HREF).toBe(`/docs/security-headers${sectionHref('webkit')}`);
  });

  it('gives every section a distinct title', () => {
    const titles = Object.values(EPUB_SECTIONS);

    expect(new Set(titles).size).toBe(titles.length);
  });
});
