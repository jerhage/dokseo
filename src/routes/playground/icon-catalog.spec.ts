import { describe, expect, it } from 'vitest';
import { iconCatalog } from './icon-catalog';

describe('iconCatalog', () => {
  it('names each icon after its file, in alphabetical order', () => {
    const catalog = iconCatalog({
      '/src/lib/ui/components/icons/X.svelte': 'x',
      '/src/lib/ui/components/icons/ChevronDown.svelte': 'chevron',
    });

    expect(catalog).toEqual([
      { name: 'ChevronDown', icon: 'chevron' },
      { name: 'X', icon: 'x' },
    ]);
  });

  it('leaves out the shared base that every icon renders', () => {
    const catalog = iconCatalog({
      '/src/lib/ui/components/icons/Icon.svelte': 'base',
      '/src/lib/ui/components/icons/Check.svelte': 'check',
    });

    expect(catalog.map((entry) => entry.name)).toEqual(['Check']);
  });
});
