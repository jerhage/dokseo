/** @typedef {'automatic' | 'light' | 'dark'} ColorScheme */

/** @typedef {(typeof THEMES)[number]} Theme */

/**
 * @typedef {object} Appearance
 * @property {Theme} theme
 * @property {ColorScheme} colorScheme
 */

/** @typedef {Pick<Element, 'getAttribute' | 'setAttribute' | 'removeAttribute'>} RootAttributes */

const THEMES = /** @type {const} */ ([
  'base',
  'petal',
  'yorha',
  'crayon',
  'ember',
  'mono',
  'forge',
  'moss',
]);

/** @type {readonly ColorScheme[]} */
const COLOR_SCHEMES = ['automatic', 'light', 'dark'];

const THEME_ATTRIBUTE = 'data-theme';

const SCHEME_ATTRIBUTE = 'data-color-scheme';

/** @type {Readonly<Record<ColorScheme, 'light' | 'dark' | undefined>>} */
const PINNED_SCHEMES = { automatic: undefined, light: 'light', dark: 'dark' };

/**
 * @param {ColorScheme} scheme
 * @returns {'light' | 'dark' | undefined}
 */
function pinnedScheme(scheme) {
  return PINNED_SCHEMES[scheme];
}

/**
 * @param {RootAttributes} root
 * @returns {Appearance}
 */
function readAppearance(root) {
  const theme = THEMES.find((name) => name === root.getAttribute(THEME_ATTRIBUTE));
  const colorScheme = COLOR_SCHEMES.find((name) => name === root.getAttribute(SCHEME_ATTRIBUTE));
  return { theme: theme ?? 'base', colorScheme: colorScheme ?? 'automatic' };
}

/**
 * @param {RootAttributes} root
 * @param {Appearance} appearance
 * @returns {void}
 */
function applyAppearance(root, appearance) {
  root.setAttribute(THEME_ATTRIBUTE, appearance.theme);
  const pinned = pinnedScheme(appearance.colorScheme);
  if (pinned === undefined) root.removeAttribute(SCHEME_ATTRIBUTE);
  else root.setAttribute(SCHEME_ATTRIBUTE, pinned);
}

export {
  COLOR_SCHEMES,
  SCHEME_ATTRIBUTE,
  THEMES,
  THEME_ATTRIBUTE,
  applyAppearance,
  pinnedScheme,
  readAppearance,
};
