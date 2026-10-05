import { describe, expect, it } from 'vitest';
import { iconCatalog } from './icon-catalog';

describe('iconCatalog', () => {
  it('names each icon after its file, in alphabetical order', () => {
    const catalog = iconCatalog({
      '../components/icons/X.svelte': 'x',
      '../components/icons/ChevronDown.svelte': 'chevron',
    });

    expect(catalog).toEqual([
      { name: 'ChevronDown', icon: 'chevron' },
      { name: 'X', icon: 'x' },
    ]);
  });

  it('leaves out the shared base that every icon renders', () => {
    const catalog = iconCatalog({
      '../components/icons/Icon.svelte': 'base',
      '../components/icons/Check.svelte': 'check',
    });

    expect(catalog.map((entry) => entry.name)).toEqual(['Check']);
  });
});
