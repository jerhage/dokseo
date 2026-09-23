import { describe, expect, it } from 'vitest';
import { CONTENT_SECURITY_POLICY } from './content-security-policy';

const NOTHING: readonly string[] = [];

function sources(directive: keyof typeof CONTENT_SECURITY_POLICY): readonly string[] {
  const named = CONTENT_SECURITY_POLICY[directive];

  return Array.isArray(named) ? named : NOTHING;
}

describe('CONTENT_SECURITY_POLICY', () => {
  it('refuses every source it does not name', () => {
    expect(sources('default-src')).toEqual(['none']);
  });

  it('keeps blob out of script-src, so a chapter blob url can never be executed', () => {
    expect(sources('script-src')).not.toContain('blob:');
  });

  it('keeps data out of script-src, so a chapter data url can never be executed', () => {
    expect(sources('script-src')).not.toContain('data:');
  });

  it('names neither inline nor eval in script-src, which is why hash mode exists', () => {
    expect(sources('script-src')).not.toContain('unsafe-inline');
    expect(sources('script-src')).not.toContain('unsafe-eval');
  });

  it('admits the blob url foliate mints for a chapter, without which no book opens', () => {
    expect(sources('frame-src')).toContain('blob:');
  });

  it('admits the blob worker zip.js starts to read an archive', () => {
    expect(sources('worker-src')).toContain('blob:');
  });

  it('admits the blob stylesheet foliate mints from a book of its own', () => {
    expect(sources('style-src')).toContain('blob:');
  });

  it('reaches no origin over plain http', () => {
    const hosts = sources('connect-src').filter((source) => source !== 'self');

    expect(hosts.length).toBeGreaterThan(0);
    for (const host of hosts) expect(host.startsWith('https://')).toBe(true);
  });

  it('plants nothing a page could navigate or submit through', () => {
    expect(sources('base-uri')).toEqual(['none']);
    expect(sources('form-action')).toEqual(['none']);
    expect(sources('object-src')).toEqual(['none']);
  });
});
