import { describe, expect, it } from 'vitest';
import { FALLBACK_NAME, defaultDeviceName } from './device-name';

const CHROME_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const EDGE_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0';
const FIREFOX_LINUX = 'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0';

describe('defaultDeviceName', () => {
  it('names the browser and the platform', () => {
    expect([
      defaultDeviceName(CHROME_MAC),
      defaultDeviceName(SAFARI_IPHONE),
      defaultDeviceName(FIREFOX_LINUX),
    ]).toEqual(['Chrome on Mac', 'Safari on iPhone', 'Firefox on Linux']);
  });

  it('prefers the browser that names itself after Chrome', () => {
    expect(defaultDeviceName(EDGE_WINDOWS)).toBe('Edge on Windows');
  });

  it('falls back when the user agent names neither', () => {
    expect(defaultDeviceName('')).toBe(FALLBACK_NAME);
  });
});
