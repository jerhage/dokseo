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
  label: 'src/lib/ui/core/styles/base/fonts.css, the first font',
  file: 'src/lib/ui/core/styles/base/fonts.css',
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
  code: `import '$lib/ui/core/styles/index.css';`,
};

const LAYER_ORDER: SourceSnippet = {
  label: 'The layer order, inline in src/app.html',
  file: 'src/app.html',
  code: `@layer open-props, reset, base, tokens, components, features, utilities, overrides;`,
};

const APPEARANCE: SourceSnippet = {
  label: 'src/lib/ui/core/appearance.js, the appearance types and the theme names',
  file: 'src/lib/ui/core/appearance.js',
  code: `/** @typedef {'automatic' | 'light' | 'dark'} ColorScheme */

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
]);`,
};

const APPLY_APPEARANCE: SourceSnippet = {
  label: 'applyAppearance sets the two attributes',
  file: 'src/lib/ui/core/appearance.js',
  code: `/**
 * @param {RootAttributes} root
 * @param {Appearance} appearance
 * @returns {void}
 */
function applyAppearance(root, appearance) {
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
  const themes = ['base', 'petal', 'yorha', 'crayon', 'ember', 'mono', 'forge', 'moss'];
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
  code: `'script-src': ['self', 'wasm-unsafe-eval', 'sha256-0ENZ8B9jcs8Jymy5KvsUKuyqtbGemMuKf9ZH5XdsHcQ='],`,
};

const SCHEME_RULES: SourceSnippet = {
  label: 'src/lib/ui/core/styles/base/scheme.css, the scheme half of the contract',
  file: 'src/lib/ui/core/styles/base/scheme.css',
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
  file: 'src/lib/ui/core/styles/base/themes/ember.css',
  code: `:root[data-theme='ember'] {`,
};

const THEME_IMPORTS: SourceSnippet = {
  label: 'src/lib/ui/core/styles/index.css imports each theme',
  file: 'src/lib/ui/core/styles/index.css',
  code: `@import 'base/themes/base.css' layer(base);
@import 'base/themes/ember.css' layer(base);`,
};

const LIBRARY_SCRIPTS: SourceSnippet = {
  label: "src/lib/ui/package.json, the library's own scripts",
  file: 'src/lib/ui/package.json',
  code: `"name": "kandan-ui-svelte",
"private": true,
"license": "MIT",
"type": "module",
"scripts": {
  "dev": "vite",
  "test": "vitest --run",
  "test:unit": "vitest --run --project unit",
  "test:watch": "vitest",
  "test:browser": "vitest --run --config vitest.browser.config.ts",
  "test:core": "node --test \\"core/**/*.test.js\\"",
  "generate:icons": "node scripts/generate-icons.js",
  "check": "svelte-check --tsconfig ./tsconfig.json",
  "lint": "oxlint .",
  "format": "oxfmt .",
  "format:check": "oxfmt --check .",
  "verify": "npm run check && npm run lint && npm run format:check && npm run test && npm run test:core"
},`,
};

const LIBRARY_DEPENDENCIES: SourceSnippet = {
  label: 'src/lib/ui/package.json, what the library runs on',
  file: 'src/lib/ui/package.json',
  code: `"dependencies": {
  "svelte": "^5.57.1",
  "ts-pattern": "^5.9.0"
},`,
};

const LIBRARY_VITEST: SourceSnippet = {
  label: "src/lib/ui/vitest.config.ts, the library's one test project",
  file: 'src/lib/ui/vitest.config.ts',
  code: `projects: [
  {
    extends: true,
    test: {
      name: 'unit',
      environment: 'node',
      include: ['**/*.{test,spec}.{js,ts}'],
      exclude: [...configDefaults.exclude, 'core/**', '**/*.svelte.{test,spec}.{js,ts}'],
    },
  },
],`,
};

const NESTED_CONFIG_OFF: SourceSnippet = {
  label: "package.json, Dokseo's lint and format scripts",
  file: 'package.json',
  code: `"lint": "oxlint --disable-nested-config src",
"lint:deps": "depcruise src --config .dependency-cruiser.cjs",
"format": "oxfmt --disable-nested-config .",
"format:check": "oxfmt --disable-nested-config --check .",`,
};

const DEPCRUISE_EXCLUDE: SourceSnippet = {
  label: '.dependency-cruiser.cjs, the files the rules never read',
  file: '.dependency-cruiser.cjs',
  code: String.raw`exclude: {
  path: [
    '^(\\.svelte-kit|build)/',
    '^src/lib/ui/vite\\.config\\.ts$',
    '^src/lib/ui/vitest\\.config\\.ts$',
    '^src/lib/ui/vitest\\.browser\\.config\\.ts$',
    '^src/lib/ui/scripts/',
    '^src/lib/ui/core/.*\\.test\\.js$',
  ],
},`,
};

const DOKSEO_UNIT_PROJECT: SourceSnippet = {
  label: "vite.config.ts, Dokseo's unit project, listed inline",
  file: 'vite.config.ts',
  code: `name: 'unit',
environment: 'node',
setupFiles: ['src/lib/shared/testing/fresh-local-storage.ts'],
include: ['src/**/*.{test,spec}.{js,ts}'],
exclude: ['src/**/*.svelte.{test,spec}.{js,ts}', 'src/lib/ui/core/**'],`,
};

const DOKSEO_CHECK: SourceSnippet = {
  label: "package.json, Dokseo's type check",
  file: 'package.json',
  code: `"check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",`,
};

const DRIFT_KEYS: SourceSnippet = {
  label: "src/app-rules/theme-before-first-paint.spec.ts, Dokseo's keys",
  file: 'src/app-rules/theme-before-first-paint.spec.ts',
  code: `const KEYS = { themeKey: 'reader.theme', schemeKey: 'reader.color-scheme' };`,
};

const DRIFT_TESTS: SourceSnippet = {
  label: 'src/app-rules/theme-before-first-paint.spec.ts, the two checks',
  file: 'src/app-rules/theme-before-first-paint.spec.ts',
  code: `it("holds the library's first-paint script for Dokseo's storage keys, as the formatter indents it", () => {
  const scripts = inlineScripts();

  expect(scripts).toHaveLength(1);
  expect(unindented(scripts[0] ?? '')).toBe(unindented(themeBootScript(KEYS)));
});

it('hashes to a source that script-src admits', () => {
  const scriptSources = CONTENT_SECURITY_POLICY['script-src'] ?? [];

  expect(scriptSources).toContain(hashOf(inlineScripts()[0] ?? ''));
});`,
};

const PLAYGROUND_ROUTE: SourceSnippet = {
  label: 'src/routes/playground/+page.svelte',
  file: 'src/routes/playground/+page.svelte',
  code: `<script lang="ts">
  import AppearanceSwitcher from '$lib/shared/AppearanceSwitcher.svelte';
  import PageTitle from '$lib/shared/PageTitle.svelte';
  import Playground from '$lib/ui/playground/Playground.svelte';
</script>

<PageTitle screen="Component library" />

<Playground>
  {#snippet appearanceControl()}
    <AppearanceSwitcher />
  {/snippet}
</Playground>`,
};

const PLAYGROUND_GUARD: SourceSnippet = {
  label: 'src/routes/playground/+page.ts',
  file: 'src/routes/playground/+page.ts',
  code: `function load(): void {
  if (!dev) error(404, 'Not found');
}`,
};

const VENDORED_SNIPPETS: readonly SourceSnippet[] = [
  LIBRARY_SCRIPTS,
  LIBRARY_DEPENDENCIES,
  LIBRARY_VITEST,
  NESTED_CONFIG_OFF,
  DEPCRUISE_EXCLUDE,
  DOKSEO_UNIT_PROJECT,
  DOKSEO_CHECK,
  DRIFT_KEYS,
  DRIFT_TESTS,
  PLAYGROUND_ROUTE,
  PLAYGROUND_GUARD,
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
  DEPCRUISE_EXCLUDE,
  DOKSEO_CHECK,
  DOKSEO_UNIT_PROJECT,
  DRIFT_KEYS,
  DRIFT_TESTS,
  FIRST_PAINT_SCRIPT,
  FONT_FACE,
  FONT_LICENSES,
  LAYER_ORDER,
  LIBRARY_DEPENDENCIES,
  LIBRARY_SCRIPTS,
  LIBRARY_VITEST,
  NESTED_CONFIG_OFF,
  NO_APP_RULE,
  NO_APP_RULE_PATHS,
  PLAYGROUND_GUARD,
  PLAYGROUND_ROUTE,
  SAVED_APPEARANCE,
  SCHEME_RULES,
  SCRIPT_HASH,
  STYLESHEET_IMPORT,
  THEME_FILE,
  THEME_IMPORTS,
  VENDORED_SNIPPETS,
};
