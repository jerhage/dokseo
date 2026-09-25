import type { ColorScheme, Theme } from '$lib/shared/appearance';

type ThemeOption = { readonly theme: Theme; readonly label: string };

type SchemeOption = {
  readonly colorScheme: ColorScheme;
  readonly label: string;
  readonly hint: string;
};

const THEME_OPTIONS: readonly ThemeOption[] = [
  { theme: 'base', label: 'Base' },
  { theme: 'ember', label: 'Ember' },
  { theme: 'mono', label: 'Mono' },
  { theme: 'forge', label: 'Forge' },
  { theme: 'crayon', label: 'Crayon' },
  { theme: 'moss', label: 'Moss' },
];

const SCHEME_OPTIONS: readonly SchemeOption[] = [
  {
    colorScheme: 'automatic',
    label: 'Automatic',
    hint: 'Follows the light or dark setting of this device',
  },
  { colorScheme: 'light', label: 'Light', hint: 'Always light' },
  { colorScheme: 'dark', label: 'Dark', hint: 'Always dark' },
];

export { SCHEME_OPTIONS, THEME_OPTIONS };
export type { SchemeOption, ThemeOption };
