import type { MediaMatches } from '$lib/shared/turn-settings';

type PointerQuery = {
  readonly feature: 'pointer' | 'any-pointer' | 'hover' | 'any-hover';
  readonly value: string;
  readonly query: string;
};

type DevicePreset = {
  readonly key: string;
  readonly label: string;
  readonly detail: string;
  readonly matching: readonly string[];
};

function query(feature: PointerQuery['feature'], value: string): PointerQuery {
  return { feature, value, query: `(${feature}: ${value})` };
}

const POINTER_QUERIES: readonly PointerQuery[] = [
  query('pointer', 'none'),
  query('pointer', 'coarse'),
  query('pointer', 'fine'),
  query('any-pointer', 'none'),
  query('any-pointer', 'coarse'),
  query('any-pointer', 'fine'),
  query('hover', 'none'),
  query('hover', 'hover'),
  query('any-hover', 'none'),
  query('any-hover', 'hover'),
];

const TOUCH_ONLY = [
  '(pointer: coarse)',
  '(any-pointer: coarse)',
  '(hover: none)',
  '(any-hover: none)',
];

const DEVICE_PRESETS: readonly DevicePreset[] = [
  { key: 'iphone', label: 'iPhone', detail: 'fingers', matching: TOUCH_ONLY },
  { key: 'ipad', label: 'iPad', detail: 'fingers only', matching: TOUCH_ONLY },
  {
    key: 'ipad-pencil',
    label: 'iPad',
    detail: 'Pencil used lately',
    matching: [...TOUCH_ONLY, '(any-pointer: fine)'],
  },
  {
    key: 'ipad-trackpad',
    label: 'iPad',
    detail: 'with a trackpad',
    matching: [
      '(pointer: coarse)',
      '(any-pointer: coarse)',
      '(any-pointer: fine)',
      '(hover: none)',
      '(any-hover: hover)',
    ],
  },
  {
    key: 'desktop',
    label: 'Desktop',
    detail: 'with a mouse',
    matching: ['(pointer: fine)', '(any-pointer: fine)', '(hover: hover)', '(any-hover: hover)'],
  },
];

function presetMatches(preset: DevicePreset): MediaMatches {
  return (asked) => preset.matching.includes(asked);
}

export { DEVICE_PRESETS, POINTER_QUERIES, presetMatches };
export type { DevicePreset, PointerQuery };
