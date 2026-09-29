import { COLOR_SCHEMES, THEMES } from '$lib/shared/appearance';
import type { ColorScheme, Theme } from '$lib/shared/appearance';
import { SCHEME_LABELS, THEME_LABELS } from '$lib/shared/appearance-labels';

type ThemeOption = { readonly theme: Theme; readonly label: string };

type SchemeOption = {
  readonly colorScheme: ColorScheme;
  readonly label: string;
  readonly hint: string;
};

const SCHEME_HINTS: Readonly<Record<ColorScheme, string>> = {
  automatic: 'Follows the light or dark setting of this device',
  light: 'Always light',
  dark: 'Always dark',
};

const THEME_OPTIONS: readonly ThemeOption[] = THEMES.map((theme) => ({
  theme,
  label: THEME_LABELS[theme],
}));

const SCHEME_OPTIONS: readonly SchemeOption[] = COLOR_SCHEMES.map((colorScheme) => ({
  colorScheme,
  label: SCHEME_LABELS[colorScheme],
  hint: SCHEME_HINTS[colorScheme],
}));

export { SCHEME_OPTIONS, THEME_OPTIONS };
export type { SchemeOption, ThemeOption };
