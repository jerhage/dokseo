import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { themeBootScript } from '../core/theme-boot.js';
import { APPEARANCE_KEYS } from './appearance-keys';

const HTML = readFileSync(new URL('./index.html', import.meta.url), 'utf8');

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

describe('the first-paint script in the playground page', () => {
  it("holds the core's first-paint script for the playground's storage keys", () => {
    const scripts = inlineScripts();

    expect(scripts).toHaveLength(1);
    expect(unindented(scripts[0] ?? '')).toBe(unindented(themeBootScript(APPEARANCE_KEYS)));
  });
});
