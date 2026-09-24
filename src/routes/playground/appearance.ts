import { match } from 'ts-pattern';

type Theme = 'base' | 'ember' | 'mono';

type ColorScheme = 'automatic' | 'light' | 'dark';

type Appearance = {
  readonly theme: Theme;
  readonly colorScheme: ColorScheme;
};

type RootAttributes = Pick<Element, 'getAttribute' | 'setAttribute' | 'removeAttribute'>;

const THEMES: readonly Theme[] = ['base', 'ember', 'mono'];

const COLOR_SCHEMES: readonly ColorScheme[] = ['automatic', 'light', 'dark'];

const THEME_ATTRIBUTE = 'data-theme';

const SCHEME_ATTRIBUTE = 'data-color-scheme';

function pinnedScheme(scheme: ColorScheme): 'light' | 'dark' | undefined {
  return match(scheme)
    .with('automatic', () => undefined)
    .with('light', () => 'light' as const)
    .with('dark', () => 'dark' as const)
    .exhaustive();
}

function readAppearance(root: RootAttributes): Appearance {
  const theme = THEMES.find((name) => name === root.getAttribute(THEME_ATTRIBUTE));
  const colorScheme = COLOR_SCHEMES.find((name) => name === root.getAttribute(SCHEME_ATTRIBUTE));
  return { theme: theme ?? 'base', colorScheme: colorScheme ?? 'automatic' };
}

function applyAppearance(root: RootAttributes, appearance: Appearance): void {
  root.setAttribute(THEME_ATTRIBUTE, appearance.theme);
  const pinned = pinnedScheme(appearance.colorScheme);
  if (pinned === undefined) root.removeAttribute(SCHEME_ATTRIBUTE);
  else root.setAttribute(SCHEME_ATTRIBUTE, pinned);
}

export { COLOR_SCHEMES, THEMES, applyAppearance, readAppearance };
export type { Appearance, ColorScheme, RootAttributes, Theme };
