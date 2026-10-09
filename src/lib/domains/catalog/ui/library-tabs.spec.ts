import { describe, expect, it } from 'vitest';
import { ARCHIVE, HOME } from './catalog-ui-fixtures';
import { DEVICE_TAB, catalogTabs, effectiveTab } from './library-tabs';

describe('catalogTabs', () => {
  it('puts On this device first and one tab per catalog by its name', () => {
    expect(catalogTabs([HOME, ARCHIVE])).toEqual([
      { id: DEVICE_TAB, label: 'On this device' },
      { id: HOME.id, label: 'Home' },
      { id: ARCHIVE.id, label: 'Archive' },
    ]);
  });
});

describe('effectiveTab', () => {
  it('keeps the chosen tab while its catalog exists', () => {
    expect(effectiveTab(HOME.id, [HOME, ARCHIVE])).toBe(HOME.id);
  });

  it('keeps the device tab', () => {
    expect(effectiveTab(DEVICE_TAB, [HOME])).toBe(DEVICE_TAB);
  });

  it('falls back to the device tab when the chosen catalog is gone or not yet listed', () => {
    expect(effectiveTab(HOME.id, [ARCHIVE])).toBe(DEVICE_TAB);
    expect(effectiveTab(HOME.id, [])).toBe(DEVICE_TAB);
  });
});
