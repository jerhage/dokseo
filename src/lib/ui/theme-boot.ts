import {
  COLOR_SCHEMES,
  SCHEME_ATTRIBUTE,
  THEMES,
  THEME_ATTRIBUTE,
  pinnedScheme,
} from './appearance';
import type { Theme } from './appearance';

type ThemeBootKeys = {
  readonly themeKey: string;
  readonly schemeKey: string;
};

const DEFAULT_THEME: Theme = 'base';

function quoted(text: string): string {
  return `'${text.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
}

function listed(names: readonly string[]): string {
  return `[${names.map(quoted).join(', ')}]`;
}

function themeBootScript({ themeKey, schemeKey }: ThemeBootKeys): string {
  const schemes = COLOR_SCHEMES.flatMap((scheme) => pinnedScheme(scheme) ?? []);
  return [
    '{',
    `  const themes = ${listed(THEMES)};`,
    `  const schemes = ${listed(schemes)};`,
    `  let theme = ${quoted(DEFAULT_THEME)};`,
    '  let scheme = null;',
    '  try {',
    `    const storedTheme = localStorage.getItem(${quoted(themeKey)});`,
    `    const storedScheme = localStorage.getItem(${quoted(schemeKey)});`,
    '    if (themes.includes(storedTheme)) theme = storedTheme;',
    '    if (schemes.includes(storedScheme)) scheme = storedScheme;',
    '  } catch {}',
    `  document.documentElement.setAttribute(${quoted(THEME_ATTRIBUTE)}, theme);`,
    `  if (scheme !== null) document.documentElement.setAttribute(${quoted(SCHEME_ATTRIBUTE)}, scheme);`,
    '}',
  ].join('\n');
}

export { themeBootScript };
export type { ThemeBootKeys };
