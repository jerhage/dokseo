import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONTENT_SECURITY_POLICY } from './content-security-policy';

const NOTHING: readonly string[] = [];

const APP_HTML = readFileSync(new URL('../../../app.html', import.meta.url), 'utf8');

function inlineScriptHashes(): readonly string[] {
  return Array.from(
    APP_HTML.matchAll(/<script>([\s\S]*?)<\/script>/gu),
    (found) =>
      `sha256-${createHash('sha256')
        .update(found[1] ?? '', 'utf8')
        .digest('base64')}`,
  );
}

function sources(directive: keyof typeof CONTENT_SECURITY_POLICY): readonly string[] {
  const named = CONTENT_SECURITY_POLICY[directive];

  return Array.isArray(named) ? named : NOTHING;
}

describe('CONTENT_SECURITY_POLICY', () => {
  it('refuses every source it does not name', () => {
    expect(sources('default-src')).toEqual(['none']);
  });

  it.each([
    { source: 'blob:', reason: 'a chapter blob url can never be executed' },
    { source: 'data:', reason: 'a chapter data url can never be executed' },
    { source: 'unsafe-inline', reason: 'hash mode exists instead' },
    { source: 'unsafe-eval', reason: 'hash mode exists instead' },
  ])('keeps $source out of script-src, so $reason', ({ source }) => {
    expect(sources('script-src')).not.toContain(source);
  });

  it('admits every inline script in app.html by its hash, so the theme applies before paint', () => {
    const hashes = inlineScriptHashes();

    expect(hashes.length).toBeGreaterThan(0);
    for (const hash of hashes) expect(sources('script-src')).toContain(hash);
  });

  it.each([
    {
      directive: 'frame-src',
      reason: 'the chapter url foliate mints, without which no book opens',
    },
    { directive: 'worker-src', reason: 'the worker zip.js starts to read an archive' },
    { directive: 'style-src', reason: 'the stylesheet foliate mints from a book of its own' },
  ] as const)('admits blob in $directive for $reason', ({ directive }) => {
    expect(sources(directive)).toContain('blob:');
  });

  it('reaches no origin over plain http', () => {
    const hosts = sources('connect-src').filter((source) => source !== 'self');

    expect(hosts.length).toBeGreaterThan(0);
    for (const host of hosts) expect(host.startsWith('https://')).toBe(true);
  });

  it('admits the web app manifest from its own origin, so the app installs', () => {
    expect(sources('manifest-src')).toEqual(['self']);
  });

  it('plants nothing a page could navigate or submit through', () => {
    expect(sources('base-uri')).toEqual(['none']);
    expect(sources('form-action')).toEqual(['none']);
    expect(sources('object-src')).toEqual(['none']);
  });
});
