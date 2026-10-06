import type { ColorScheme, Theme } from '../core/appearance.js';

const THEME_LABELS: Readonly<Record<Theme, string>> = {
  base: 'Base',
  ember: 'Ember',
  mono: 'Mono',
  forge: 'Forge',
  crayon: 'Crayon',
  moss: 'Moss',
  petal: 'Petal',
  yorha: 'YoRHa',
};

const SCHEME_LABELS: Readonly<Record<ColorScheme, string>> = {
  automatic: 'Automatic',
  light: 'Light',
  dark: 'Dark',
};

export { SCHEME_LABELS, THEME_LABELS };
