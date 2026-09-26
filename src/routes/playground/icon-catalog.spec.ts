import { describe, expect, it } from 'vitest';
import { iconCatalog } from './icon-catalog';

describe('iconCatalog', () => {
  it('names each icon after its file, in alphabetical order', () => {
    const catalog = iconCatalog({
      '/src/lib/components/icons/X.svelte': 'x',
      '/src/lib/components/icons/ChevronDown.svelte': 'chevron',
    });

    expect(catalog).toEqual([
      { name: 'ChevronDown', icon: 'chevron' },
      { name: 'X', icon: 'x' },
    ]);
  });

  it('leaves out the shared base that every icon renders', () => {
    const catalog = iconCatalog({
      '/src/lib/components/icons/Icon.svelte': 'base',
      '/src/lib/components/icons/Check.svelte': 'check',
    });

    expect(catalog.map((entry) => entry.name)).toEqual(['Check']);
  });
});
