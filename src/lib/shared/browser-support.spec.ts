import { describe, expect, it } from 'vitest';
import { canRunHere, featuresOf, SUPPORT_TABLE_URL, UNSUPPORTED_NOTICE } from './browser-support';

describe('canRunHere', () => {
  it('runs where both features are present, as Chrome and Firefox are', () => {
    expect(canRunHere({ dispose: Symbol('dispose'), disposableStack: (): void => undefined })).toBe(
      true,
    );
  });

  it('refuses a browser with no Symbol.dispose, as Safari has none', () => {
    expect(canRunHere({ dispose: undefined, disposableStack: (): void => undefined })).toBe(false);
  });

  it('refuses a browser with no DisposableStack, as Safari has none', () => {
    expect(canRunHere({ dispose: Symbol('dispose'), disposableStack: undefined })).toBe(false);
  });

  it('is not fooled by a property of the wrong kind', () => {
    expect(canRunHere({ dispose: 'Symbol.dispose', disposableStack: {} })).toBe(false);
  });
});

describe('featuresOf', () => {
  it('reads both features from the running scope', () => {
    const features = featuresOf(globalThis);

    expect(Object.keys(features).toSorted()).toEqual(['disposableStack', 'dispose']);
  });
});

describe('SUPPORT_TABLE_URL', () => {
  it('points at the compatibility table itself, not the page above it', () => {
    expect(SUPPORT_TABLE_URL).toContain('developer.mozilla.org');
    expect(SUPPORT_TABLE_URL).toContain('#browser_compatibility');
  });

  it('names the later of the two features, so the table answers both', () => {
    expect(SUPPORT_TABLE_URL).toContain('DisposableStack');
  });
});

describe('UNSUPPORTED_NOTICE', () => {
  it('names a browser that works, so a reader knows where to go', () => {
    expect(UNSUPPORTED_NOTICE).toContain('Chrome');
    expect(UNSUPPORTED_NOTICE).toContain('Firefox');
  });

  it('names no browser as the culprit, because a capability is what was detected', () => {
    expect(UNSUPPORTED_NOTICE).not.toContain('Safari');
  });
});
