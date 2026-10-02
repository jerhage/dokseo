import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APP_VERSION } from './app-version';

describe('APP_VERSION', () => {
  it('carries the version field of package.json', () => {
    const manifest: { version: string } = JSON.parse(readFileSync('package.json', 'utf8'));

    expect(APP_VERSION).toBe(manifest.version);
  });
});
