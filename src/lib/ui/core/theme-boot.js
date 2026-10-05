import {
  COLOR_SCHEMES,
  SCHEME_ATTRIBUTE,
  THEMES,
  THEME_ATTRIBUTE,
  pinnedScheme,
} from './appearance.js';

/** @typedef {import('./appearance.js').Theme} Theme */

/**
 * @typedef {object} ThemeBootKeys
 * @property {string} themeKey
 * @property {string} schemeKey
 */

/** @type {Theme} */
const DEFAULT_THEME = 'base';

/**
 * @param {string} text
 * @returns {string}
 */
function quoted(text) {
  return `'${text.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
}

/**
 * @param {readonly string[]} names
 * @returns {string}
 */
function listed(names) {
  return `[${names.map(quoted).join(', ')}]`;
}

/**
 * @param {ThemeBootKeys} keys
 * @returns {string}
 */
function themeBootScript({ themeKey, schemeKey }) {
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
