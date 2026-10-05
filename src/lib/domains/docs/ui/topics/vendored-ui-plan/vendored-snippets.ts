import type { SourceSnippet } from '../ocr/ocr-snippets';

const NO_APP_RULE: SourceSnippet = {
  label: 'The dependency rule base-components-know-no-app',
  file: '.dependency-cruiser.cjs',
  code: `name: 'base-components-know-no-app',`,
};

const NO_APP_RULE_PATHS: SourceSnippet = {
  label: 'What the rule refuses',
  file: '.dependency-cruiser.cjs',
  code: `from: { path: '^src/lib/ui/' },
to: {
  path: ['^src/', '(^|/)node_modules/'],
  pathNot: ['^src/lib/ui/', '(^|/)node_modules/(svelte|ts-pattern|vitest)/'],
},`,
};

const FONT_FACE: SourceSnippet = {
  label: 'src/lib/ui/styles/base/fonts.css, the first font',
  file: 'src/lib/ui/styles/base/fonts.css',
  code: `@font-face {
  font-family: 'Bricolage Grotesque';
  src: url('../../fonts/bricolage-grotesque.woff2') format('woff2');`,
};

const FONT_LICENSES: SourceSnippet = {
  label: 'vite.config.ts, the plugin that publishes the font licenses',
  file: 'vite.config.ts',
  code: `applyToEnvironment: (environment) => environment.config.consumer === 'client',
generateBundle() {
  for (const name of readdirSync(FONT_FOLDER)) {
    if (!FONT_LICENSE.test(name)) continue;
    this.emitFile({
      type: 'asset',
      fileName: \`fonts/\${name}\`,
      source: readFileSync(\`\${FONT_FOLDER}/\${name}\`),
    });
  }
},`,
};

const STYLESHEET_IMPORT: SourceSnippet = {
  label: 'src/routes/+layout.svelte imports the stylesheet once',
  file: 'src/routes/+layout.svelte',
  code: `import '$lib/ui/styles/index.css';`,
};

const LAYER_ORDER: SourceSnippet = {
  label: 'The layer order, inline in src/app.html',
  file: 'src/app.html',
  code: `@layer open-props, reset, base, tokens, components, features, utilities, overrides;`,
};

const APPEARANCE: SourceSnippet = {
  label: 'src/lib/ui/appearance.ts, the part that moved into the library',
  file: 'src/lib/ui/appearance.ts',
  code: `type Theme = 'base' | 'ember' | 'mono' | 'forge' | 'crayon' | 'moss' | 'petal' | 'yorha';

type ColorScheme = 'automatic' | 'light' | 'dark';

type Appearance = {
  readonly theme: Theme;
  readonly colorScheme: ColorScheme;
};

type RootAttributes = Pick<Element, 'getAttribute' | 'setAttribute' | 'removeAttribute'>;

const THEMES: readonly Theme[] = [
  'base',
  'petal',
  'yorha',
  'crayon',
  'ember',
  'mono',
  'forge',
  'moss',
];`,
};

const APPLY_APPEARANCE: SourceSnippet = {
  label: 'applyAppearance sets the two attributes',
  file: 'src/lib/ui/appearance.ts',
  code: `function applyAppearance(root: RootAttributes, appearance: Appearance): void {
  root.setAttribute(THEME_ATTRIBUTE, appearance.theme);
  const pinned = pinnedScheme(appearance.colorScheme);
  if (pinned === undefined) root.removeAttribute(SCHEME_ATTRIBUTE);
  else root.setAttribute(SCHEME_ATTRIBUTE, pinned);
}`,
};

const SAVED_APPEARANCE: SourceSnippet = {
  label: 'src/lib/shared/saved-appearance.ts, the glue that stays in Dokseo',
  file: 'src/lib/shared/saved-appearance.ts',
  code: `const THEME_KEY = 'reader.theme';

const SCHEME_KEY = 'reader.color-scheme';

function chooseAppearance(
  root: RootAttributes,
  appearance: Appearance,
  locate?: LocateStore,
): void {
  applyAppearance(root, appearance);
  rememberedString(THEME_KEY, locate).write(appearance.theme);
  const scheme = rememberedString(SCHEME_KEY, locate);
  const pinned = pinnedScheme(appearance.colorScheme);
  if (pinned === undefined) scheme.forget();
  else scheme.write(pinned);
}`,
};

const FIRST_PAINT_SCRIPT: SourceSnippet = {
  label: 'The first-paint script in src/app.html',
  file: 'src/app.html',
  code: `{
  const themes = ['base', 'ember', 'mono', 'forge', 'crayon', 'moss', 'petal', 'yorha'];
  const schemes = ['light', 'dark'];
  let theme = 'base';
  let scheme = null;
  try {
    const storedTheme = localStorage.getItem('reader.theme');
    const storedScheme = localStorage.getItem('reader.color-scheme');
    if (themes.includes(storedTheme)) theme = storedTheme;
    if (schemes.includes(storedScheme)) scheme = storedScheme;
  } catch {}
  document.documentElement.setAttribute('data-theme', theme);
  if (scheme !== null) document.documentElement.setAttribute('data-color-scheme', scheme);
}`,
};

const SCRIPT_HASH: SourceSnippet = {
  label: 'The script admitted by its hash in the content security policy',
  file: 'src/lib/platform/security/content-security-policy.ts',
  code: `'script-src': ['self', 'wasm-unsafe-eval', 'sha256-zt9MSkCzdyugQp42Qq7L4UQ4u5MHRIIkgZyHPQlGxi4='],`,
};

const SCHEME_RULES: SourceSnippet = {
  label: 'src/lib/ui/styles/base/scheme.css, the scheme half of the contract',
  file: 'src/lib/ui/styles/base/scheme.css',
  code: `:root {
  color-scheme: light dark;
}
:root[data-color-scheme='light'] {
  color-scheme: light;
}
:root[data-color-scheme='dark'] {
  color-scheme: dark;
}`,
};

const THEME_FILE: SourceSnippet = {
  label: 'A theme file starts with its selector',
  file: 'src/lib/ui/styles/base/themes/ember.css',
  code: `:root[data-theme='ember'] {`,
};

const THEME_IMPORTS: SourceSnippet = {
  label: 'src/lib/ui/styles/index.css imports each theme',
  file: 'src/lib/ui/styles/index.css',
  code: `@import 'base/themes/base.css' layer(base);
@import 'base/themes/ember.css' layer(base);`,
};

const VENDORED_SNIPPETS: readonly SourceSnippet[] = [
  NO_APP_RULE,
  NO_APP_RULE_PATHS,
  FONT_FACE,
  FONT_LICENSES,
  STYLESHEET_IMPORT,
  LAYER_ORDER,
  APPEARANCE,
  APPLY_APPEARANCE,
  SAVED_APPEARANCE,
  FIRST_PAINT_SCRIPT,
  SCRIPT_HASH,
  SCHEME_RULES,
  THEME_FILE,
  THEME_IMPORTS,
];

export {
  APPEARANCE,
  APPLY_APPEARANCE,
  FIRST_PAINT_SCRIPT,
  FONT_FACE,
  FONT_LICENSES,
  LAYER_ORDER,
  NO_APP_RULE,
  NO_APP_RULE_PATHS,
  SAVED_APPEARANCE,
  SCHEME_RULES,
  SCRIPT_HASH,
  STYLESHEET_IMPORT,
  THEME_FILE,
  THEME_IMPORTS,
  VENDORED_SNIPPETS,
};
