import { describe, expect, it } from 'vitest';
import {
  cascadeOrder,
  formatSpecificity,
  specificity,
  splitSelectorList,
  tokenChain,
  varReference,
} from './cascade';
import type { CascadeEntry } from './cascade';

const LAYERS = ['reset', 'base', 'tokens', 'components', 'features', 'utilities', 'overrides'];

function entry(overrides: Partial<CascadeEntry>): CascadeEntry {
  return {
    layer: 'components',
    selector: '.x',
    specificity: [0, 1, 0],
    value: 'red',
    order: 0,
    ...overrides,
  };
}

describe('splitSelectorList', () => {
  it('splits at top-level commas only', () => {
    expect(splitSelectorList('button.tag:hover, a:is(.b, .c), [data-x="1,2"]')).toEqual([
      'button.tag:hover',
      'a:is(.b, .c)',
      '[data-x="1,2"]',
    ]);
  });
});

describe('specificity', () => {
  it.each([
    ['.btn', [0, 1, 0]],
    ['.btn.is-active', [0, 2, 0]],
    ['button.tag:hover', [0, 2, 1]],
    [':root', [0, 1, 0]],
    [':root[data-theme="ember"]', [0, 2, 0]],
    ['#main .card > h2', [1, 1, 1]],
    [':where(.btn) .x', [0, 1, 0]],
    [':is(.a, #b) p', [1, 0, 1]],
    [':not(.a.b)', [0, 2, 0]],
    ['.btn::before', [0, 1, 1]],
    ['a:after', [0, 0, 2]],
    ['*', [0, 0, 0]],
  ] as const)('counts %s as %j', (selector, expected) => {
    expect(specificity(selector)).toEqual(expected);
  });
});

describe('cascadeOrder', () => {
  it('ranks a later layer above a more specific rule in an earlier one', () => {
    const component = entry({
      layer: 'components',
      selector: '.btn.is-active',
      specificity: [0, 2, 0],
    });
    const utility = entry({ layer: 'utilities', selector: '.text-danger', order: 1 });

    expect(cascadeOrder([utility, component], LAYERS).at(-1)).toBe(utility);
  });

  it('ranks by specificity, then by order, inside one layer', () => {
    const plain = entry({ order: 5 });
    const specific = entry({ specificity: [0, 2, 0], order: 1 });
    const later = entry({ order: 9 });

    expect(cascadeOrder([specific, later, plain], LAYERS)).toEqual([plain, later, specific]);
  });

  it('ranks an unlayered rule above every layer', () => {
    const unlayered = entry({ layer: null, specificity: [0, 0, 1] });
    const override = entry({ layer: 'overrides', specificity: [1, 0, 0] });

    expect(cascadeOrder([unlayered, override], LAYERS).at(-1)).toBe(unlayered);
  });
});

describe('varReference', () => {
  it('reads the name of a lone var() and nothing else', () => {
    expect(varReference(' var(--ds-primary) ')).toBe('--ds-primary');
    expect(varReference('var(--a, red)')).toBeNull();
    expect(varReference('light-dark(red, blue)')).toBeNull();
  });
});

describe('tokenChain', () => {
  it('follows each lone var() to the value at the end', () => {
    const table = new Map([
      ['--color-primary', entry({ layer: 'tokens', value: 'var(--ds-primary)' })],
      ['--ds-primary', entry({ layer: 'base', value: 'var(--ds-spruce-500)' })],
      ['--ds-spruce-500', entry({ layer: 'base', value: 'light-dark(red, blue)' })],
    ]);
    const chain = tokenChain('--color-primary', (name) => table.get(name) ?? null);

    expect(chain.end).toBe('value');
    expect(chain.steps.map((step) => step.name)).toEqual([
      '--color-primary',
      '--ds-primary',
      '--ds-spruce-500',
    ]);
  });

  it('reports a name nothing declares', () => {
    expect(tokenChain('--nope', () => null)).toEqual({ steps: [], end: 'missing' });
  });

  it('stops a chain that loops', () => {
    const looping = entry({ value: 'var(--loop)' });

    expect(tokenChain('--loop', () => looping).end).toBe('too-deep');
  });
});

describe('formatSpecificity', () => {
  it('writes the three counts in brackets', () => {
    expect(formatSpecificity([0, 2, 1])).toBe('(0, 2, 1)');
  });
});
