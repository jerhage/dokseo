import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONTENT_SECURITY_POLICY } from '../lib/platform/security/content-security-policy';
import { themeBootScript } from '../lib/ui/core/theme-boot.js';

const HTML = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

const KEYS = { themeKey: 'reader.theme', schemeKey: 'reader.color-scheme' };

function inlineScripts(): readonly string[] {
  return Array.from(HTML.matchAll(/<script>([\s\S]*?)<\/script>/gu), (found) => found[1] ?? '');
}

function unindented(code: string): string {
  return code
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

function hashOf(script: string): string {
  return `sha256-${createHash('sha256').update(script, 'utf8').digest('base64')}`;
}

describe('the theme script in app.html', () => {
  it("holds the library's first-paint script for Dokseo's storage keys, as the formatter indents it", () => {
    const scripts = inlineScripts();

    expect(scripts).toHaveLength(1);
    expect(unindented(scripts[0] ?? '')).toBe(unindented(themeBootScript(KEYS)));
  });

  it('hashes to a source that script-src admits', () => {
    const scriptSources = CONTENT_SECURITY_POLICY['script-src'] ?? [];

    expect(scriptSources).toContain(hashOf(inlineScripts()[0] ?? ''));
  });
});
