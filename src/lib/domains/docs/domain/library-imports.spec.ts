import { describe, expect, it } from 'vitest';
import {
  filesImporting,
  importKind,
  importSpecifiers,
  importTarget,
  tallyImports,
} from './library-imports';

describe('importSpecifiers', () => {
  it('reads static, type, side-effect and dynamic imports and file URLs once each', () => {
    const source = [
      "import Button from './Button.svelte';",
      "import type { Snippet } from 'svelte';",
      'import {',
      '  match,',
      "} from 'ts-pattern';",
      "import '$lib/ui/styles/index.css';",
      "const lazy = import('./lazy');",
      "const STYLES = new URL('../styles/', import.meta.url);",
      "const NESTED = new URL('components/', STYLES);",
      "import Again from './Button.svelte';",
    ].join('\n');

    expect(importSpecifiers(source)).toEqual([
      './Button.svelte',
      'svelte',
      'ts-pattern',
      '$lib/ui/styles/index.css',
      './lazy',
      '../styles/',
    ]);
  });

  it('finds nothing in a file without imports', () => {
    expect(importSpecifiers(':root { --space-2: 0.5rem; }')).toEqual([]);
  });
});

describe('importKind', () => {
  it.each([
    ['svelte/elements', 'package'],
    ['./Button.svelte', 'sibling'],
    ['../styles/', 'parent'],
    ['$lib/ui/appearance', 'alias'],
  ] as const)('classes %s as a %s import', (specifier, kind) => {
    expect(importKind(specifier)).toBe(kind);
  });
});

describe('importTarget', () => {
  it('groups siblings together, keeps the folder of a parent and the root of an alias', () => {
    expect(importTarget('./icons/X.svelte')).toBe('./');
    expect(importTarget('../styles/tokens/space.css')).toBe('../styles/tokens/');
    expect(importTarget('../../../')).toBe('../../../');
    expect(importTarget('$lib/ui/appearance')).toBe('$lib');
    expect(importTarget('svelte/attachments')).toBe('svelte/attachments');
  });
});

describe('tallyImports', () => {
  const tallies = tallyImports([
    "import { a } from './a';\nimport { b } from './b';\nimport { match } from 'ts-pattern';",
    "import { c } from './c';\nimport x from '$lib/x';",
    "import { match } from 'ts-pattern';\nimport 'svelte';",
  ]);

  it('counts each target once per file, packages first and the most used first', () => {
    expect(tallies).toEqual([
      { target: 'ts-pattern', kind: 'package', files: 2 },
      { target: 'svelte', kind: 'package', files: 1 },
      { target: './', kind: 'sibling', files: 2 },
      { target: '$lib', kind: 'alias', files: 1 },
    ]);
  });
});

describe('filesImporting', () => {
  const sources = [
    "import { a } from '../a';\nimport { b } from '../../b';",
    "import { c } from './c';\nimport x from '$lib/x';",
    "import { match } from 'ts-pattern';",
  ];

  it('counts a file once however many of its imports are of the kind', () => {
    expect(filesImporting(sources, 'parent')).toBe(1);
  });

  it('counts the files with at least one import of the kind', () => {
    expect(filesImporting(sources, 'alias')).toBe(1);
    expect(filesImporting(sources, 'package')).toBe(1);
    expect(filesImporting([sources[2] ?? ''], 'sibling')).toBe(0);
  });
});
