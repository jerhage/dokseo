import type { SourceSnippet } from '../ocr/ocr-snippets';

const THEME_NAMES: SourceSnippet = {
  label: 'src/lib/ui/core/appearance.js, the themes and the two attributes',
  file: 'src/lib/ui/core/appearance.js',
  code: `const THEMES = /** @type {const} */ ([
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

const SCHEME_ATTRIBUTE = 'data-color-scheme';`,
};

const PINNED_SCHEME: SourceSnippet = {
  label: 'pinnedScheme in appearance.js, an object lookup where match was',
  file: 'src/lib/ui/core/appearance.js',
  code: `/** @type {Readonly<Record<ColorScheme, 'light' | 'dark' | undefined>>} */
const PINNED_SCHEMES = { automatic: undefined, light: 'light', dark: 'dark' };

/**
 * @param {ColorScheme} scheme
 * @returns {'light' | 'dark' | undefined}
 */
function pinnedScheme(scheme) {
  return PINNED_SCHEMES[scheme];
}`,
};

const APPLY_APPEARANCE: SourceSnippet = {
  label: 'applyAppearance writes the two attributes on any element',
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

const THEME_BOOT_IMPORTS: SourceSnippet = {
  label: 'src/lib/ui/core/theme-boot.js imports only appearance.js',
  file: 'src/lib/ui/core/theme-boot.js',
  code: `import {
  COLOR_SCHEMES,
  SCHEME_ATTRIBUTE,
  THEMES,
  THEME_ATTRIBUTE,
  pinnedScheme,
} from './appearance.js';

/** @typedef {import('./appearance.js').Theme} Theme */`,
};

const CHECK_ICON: SourceSnippet = {
  label: 'src/lib/ui/components/icons/Check.svelte, the whole file',
  file: 'src/lib/ui/components/icons/Check.svelte',
  code: `<script lang="ts">
  import Icon from './Icon.svelte';
  import type { IconProps } from './icon';

  let props: IconProps = $props();
</script>

<Icon {...props} name="check" iconNode={[['path', { d: 'M20 6 9 17l-5-5' }]]} />`,
};

const ICON_SVG: SourceSnippet = {
  label: 'Icon.svelte writes the svg element every icon shares',
  file: 'src/lib/ui/components/icons/Icon.svelte',
  code: `<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 {ICON_GRID} {ICON_GRID}"
  fill="none"
  stroke={color}
  stroke-width={stroke.width}
  stroke-linecap="round"
  stroke-linejoin="round"`,
};

const ACCORDION_DETAILS: SourceSnippet = {
  label: 'AccordionItem.svelte: a details element, no script beyond the props',
  file: 'src/lib/ui/components/AccordionItem.svelte',
  code: `<details {...rest} bind:open class={['accordion-item', className]}>
  <summary class="accordion-trigger">`,
};

const POPOVER_ATTRIBUTES: SourceSnippet = {
  label: 'Popover.svelte: the popover attribute opens and closes the sheet',
  file: 'src/lib/ui/components/Popover.svelte',
  code: `id="{uid}-popover"
popover="auto"
role="dialog"
aria-label={label}
class={['popover', className]}`,
};

const MODAL_SHOW: SourceSnippet = {
  label: 'Modal.svelte opens its dialog with showModal()',
  file: 'src/lib/ui/components/Modal.svelte',
  code: `dialog?.showModal();
focusFirst();`,
};

const TAB_BUTTON: SourceSnippet = {
  label: 'Tabs.svelte: the ARIA states each tab button writes',
  file: 'src/lib/ui/components/Tabs.svelte',
  code: `<button
  bind:this={buttons[index]}
  type="button"
  role="tab"
  id="{uid}-tab-{index}"
  aria-controls="{uid}-panel-{index}"
  aria-selected={tab.id === shown}
  tabindex={tab.id === shown ? 0 : -1}`,
};

const TAB_KEYS: SourceSnippet = {
  label: 'src/lib/ui/components/roving.ts, the tab keys for left-to-right text',
  file: 'src/lib/ui/components/roving.ts',
  code: `ArrowRight: 'next',
ArrowLeft: 'previous',
Home: 'first',
End: 'last',`,
};

const LAYER_IMPORTS: SourceSnippet = {
  label: 'src/lib/ui/core/styles/index.css, the first imports',
  file: 'src/lib/ui/core/styles/index.css',
  code: `@import 'reset.css' layer(reset);

@import 'base/fonts.css' layer(base);
@import 'base/primitives.css' layer(base);`,
};

const FONT_URL: SourceSnippet = {
  label: 'src/lib/ui/core/styles/base/fonts.css names a font relative to itself',
  file: 'src/lib/ui/core/styles/base/fonts.css',
  code: `src: url('../../fonts/bricolage-grotesque.woff2') format('woff2');`,
};

const DESIGN_SPEC_IMPORTS: SourceSnippet = {
  label: 'src/lib/ui/core/styles/design-system.test.js, the imports from the core',
  file: 'src/lib/ui/core/styles/design-system.test.js',
  code: `import { NARROW_SCREEN_QUERY } from '../breakpoints.js';
import { filesUnder } from '../library-files.js';
import { TAG_COLOURS } from '../tag-colours.js';`,
};

const ANY_PREFIX: SourceSnippet = {
  label: 'src/lib/ui/GUIDE.md on prefixes',
  file: 'src/lib/ui/GUIDE.md',
  code: `Every file reaches the others by relative path. Nothing imports an app alias such as \`$lib\`, so
the folder works at any prefix.`,
};

const FONT_FOLDER: SourceSnippet = {
  label: "vite.config.ts, the font folder Dokseo's license plugin reads",
  file: 'vite.config.ts',
  code: `const FONT_FOLDER = 'src/lib/ui/core/fonts';`,
};

const LIBRARY_STYLESHEET: SourceSnippet = {
  label: "src/routes/+layout.svelte imports the library's stylesheet",
  file: 'src/routes/+layout.svelte',
  code: `import '$lib/ui/core/styles/index.css';`,
};

const DROPZONE_FOCUS: SourceSnippet = {
  label: 'src/lib/ui/core/styles/components/forms/dropzone.css styles the wrapper from its input',
  file: 'src/lib/ui/core/styles/components/forms/dropzone.css',
  code: `.dropzone:has(.dropzone-input:focus-visible) {`,
};

const BADGE_FIXTURE: SourceSnippet = {
  label: 'src/lib/ui/core/fixtures/badge/success.html, the whole file',
  file: 'src/lib/ui/core/fixtures/badge/success.html',
  code: `<span class="badge badge-success">Read</span>`,
};

const ACCORDION_FIXTURE: SourceSnippet = {
  label: 'src/lib/ui/core/fixtures/accordion-item/closed.html, the whole file',
  file: 'src/lib/ui/core/fixtures/accordion-item/closed.html',
  code: `<details class="accordion-item">
  <summary class="accordion-trigger">
    Details
    <svg
      aria-hidden="true"
      class="accordion-icon lucide lucide-chevron-down"
      fill="none"
      height="24"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="m6 9 6 6 6-6"></path>
    </svg>
  </summary>
  <div class="accordion-body">Body</div>
</details>`,
};

const POPOVER_FIXTURE: SourceSnippet = {
  label: 'src/lib/ui/core/fixtures/popover/default.html, the whole file',
  file: 'src/lib/ui/core/fixtures/popover/default.html',
  code: `<button aria-haspopup="dialog" class="btn" popovertarget="id-1" type="button">Filters</button>
<div aria-label="Filters" class="popover" id="id-1" popover="auto" role="dialog">
  <p>Body</p>
</div>`,
};

const ADD_FIXTURE_STEP: SourceSnippet = {
  label: 'src/lib/ui/core/GUIDE.md on adding a fixture',
  file: 'src/lib/ui/core/GUIDE.md',
  code: `Render the variant in a framework version, write \`fixtureText(rendered)\` to
\`fixtures/<component>/<variant>.html\`, and add the variant to the framework version's table.`,
};

const ID_ATTRIBUTES: SourceSnippet = {
  label: 'src/lib/ui/core/contract/normalize.js, the attributes whose values become placeholders',
  file: 'src/lib/ui/core/contract/normalize.js',
  code: `const ID_ATTRIBUTES = new Set([
  'id',
  'for',
  'popovertarget',
  'aria-controls',
  'aria-labelledby',
  'aria-describedby',
]);`,
};

const COMPARE_MARKUP: SourceSnippet = {
  label: 'src/lib/ui/core/contract/compare.js, the start of compareMarkup',
  file: 'src/lib/ui/core/contract/compare.js',
  code: `function compareMarkup(rendered, fixture) {
  const fromComponent = formattedMarkup(rendered);
  const fromFixture = formattedMarkup(fixture);
  if (fromComponent === fromFixture) {
    return { kind: 'match', rendered: fromComponent, fixture: fromFixture };
  }`,
};

const CONTRACT_SPEC: SourceSnippet = {
  label: 'src/lib/ui/contract/contract.spec.ts, one test per case',
  file: 'src/lib/ui/contract/contract.spec.ts',
  code: `it.each(CASES.map((shown) => [shown.path, shown] as const))(
  'renders %s as its core fixture describes',
  (path, shown) => {
    const result = compareMarkup(render(CaseHost, { props: { shown } }).body, fixture(path));

    expect(result.rendered).toBe(result.fixture);
  },
);`,
};

const CASE_ROW: SourceSnippet = {
  label: 'src/lib/ui/contract/cases.ts, the row for one fixture',
  file: 'src/lib/ui/contract/cases.ts',
  code: `{ path: 'badge/success', render: markup.badgeSuccess },`,
};

const CASE_SNIPPET: SourceSnippet = {
  label: 'src/lib/ui/contract/CaseMarkup.svelte, the snippet that renders it',
  file: 'src/lib/ui/contract/CaseMarkup.svelte',
  code: `{#snippet badgeSuccess()}<Badge variant="success">Read</Badge>{/snippet}`,
};

const TAB_RULE: SourceSnippet = {
  label: 'src/lib/ui/core/rules/tabs.json, the start of the ArrowRight rule',
  file: 'src/lib/ui/core/rules/tabs.json',
  code: `"name": "shows and focuses the next tab on ArrowRight in a left-to-right layout",
"fixture": "tabs/underline",
"given": [
  {
    "selector": ".tab:nth-child(1)",
    "focused": true
  }
],
"when": [
  {
    "event": "keydown",
    "key": "ArrowRight",
    "target": ".tab:nth-child(1)"
  }
],`,
};

const UNCERTAIN_TODO: SourceSnippet = {
  label: 'src/lib/ui/contract/rules.svelte.spec.ts, a rule that is not certain',
  file: 'src/lib/ui/contract/rules.svelte.spec.ts',
  code: `if (!rule.certain) {
  it.todo(rule.name);
  continue;
}`,
};

const LIBRARY_CI: SourceSnippet = {
  label: "src/lib/ui/.github/workflows/ci.yml, the library's CI steps",
  file: 'src/lib/ui/.github/workflows/ci.yml',
  code: `- run: npm install

- run: npm run verify

- run: npx playwright install --with-deps chromium

- run: npm run test:browser`,
};

const CORE_TEST_SCRIPT: SourceSnippet = {
  label: "src/lib/ui/core/package.json, the core's scripts",
  file: 'src/lib/ui/core/package.json',
  code: `"test": "node --test",
"check": "tsc --noEmit -p jsconfig.json"`,
};

const LIBRARY_CORE_SCRIPTS: SourceSnippet = {
  label: "src/lib/ui/package.json, the script that runs the core's specs",
  file: 'src/lib/ui/package.json',
  code: `"test:core": "node --test \\"core/**/*.test.js\\"",`,
};

const LIBRARY_VERIFY: SourceSnippet = {
  label: "src/lib/ui/package.json, the library's verify script",
  file: 'src/lib/ui/package.json',
  code: `"verify": "npm run check && npm run lint && npm run format:check && npm run test && npm run test:core"`,
};

const DOKSEO_UNIT_EXCLUDE: SourceSnippet = {
  label: "vite.config.ts, Dokseo's unit project leaves out the core",
  file: 'vite.config.ts',
  code: `include: ['src/**/*.{test,spec}.{js,ts}'],
exclude: ['src/**/*.svelte.{test,spec}.{js,ts}', 'src/lib/ui/core/**'],`,
};

const DOKSEO_BROWSER_EXCLUDE: SourceSnippet = {
  label: "vite.config.ts, Dokseo's browser project leaves out the whole library",
  file: 'vite.config.ts',
  code: `include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
exclude: ['src/lib/ui/**'],`,
};

const CHECK_SVG: SourceSnippet = {
  label: 'src/lib/ui/core/icons/check.svg, the whole file',
  file: 'src/lib/ui/core/icons/check.svg',
  code: `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  class="lucide lucide-check"
>
  <path d="M20 6 9 17l-5-5" />
</svg>`,
};

const GENERATE_ICONS: SourceSnippet = {
  label: 'src/lib/ui/scripts/generate-icons.js, the whole file',
  file: 'src/lib/ui/scripts/generate-icons.js',
  code: `import { writeFileSync } from 'node:fs';
import { iconComponents } from './icon-components.js';

const SOURCES = new URL('../core/icons/', import.meta.url);

const COMPONENTS = new URL('../components/icons/', import.meta.url);

for (const { file, source } of iconComponents(SOURCES)) {
  writeFileSync(new URL(file, COMPONENTS), source);
}`,
};

const CORE_SNIPPETS: readonly SourceSnippet[] = [
  DROPZONE_FOCUS,
  THEME_NAMES,
  PINNED_SCHEME,
  APPLY_APPEARANCE,
  THEME_BOOT_IMPORTS,
  CHECK_ICON,
  ICON_SVG,
  ACCORDION_DETAILS,
  POPOVER_ATTRIBUTES,
  MODAL_SHOW,
  TAB_BUTTON,
  TAB_KEYS,
  LAYER_IMPORTS,
  FONT_URL,
  DESIGN_SPEC_IMPORTS,
  ANY_PREFIX,
  FONT_FOLDER,
  LIBRARY_STYLESHEET,
  BADGE_FIXTURE,
  ACCORDION_FIXTURE,
  POPOVER_FIXTURE,
  ADD_FIXTURE_STEP,
  ID_ATTRIBUTES,
  COMPARE_MARKUP,
  CONTRACT_SPEC,
  CASE_ROW,
  CASE_SNIPPET,
  TAB_RULE,
  UNCERTAIN_TODO,
  LIBRARY_CI,
  CORE_TEST_SCRIPT,
  LIBRARY_CORE_SCRIPTS,
  LIBRARY_VERIFY,
  DOKSEO_UNIT_EXCLUDE,
  DOKSEO_BROWSER_EXCLUDE,
  CHECK_SVG,
  GENERATE_ICONS,
];

export {
  ACCORDION_DETAILS,
  ACCORDION_FIXTURE,
  ADD_FIXTURE_STEP,
  ANY_PREFIX,
  APPLY_APPEARANCE,
  BADGE_FIXTURE,
  CASE_ROW,
  CASE_SNIPPET,
  CHECK_ICON,
  CHECK_SVG,
  COMPARE_MARKUP,
  CONTRACT_SPEC,
  CORE_SNIPPETS,
  CORE_TEST_SCRIPT,
  DESIGN_SPEC_IMPORTS,
  DOKSEO_BROWSER_EXCLUDE,
  DOKSEO_UNIT_EXCLUDE,
  DROPZONE_FOCUS,
  FONT_FOLDER,
  FONT_URL,
  GENERATE_ICONS,
  ICON_SVG,
  ID_ATTRIBUTES,
  LAYER_IMPORTS,
  LIBRARY_CI,
  LIBRARY_CORE_SCRIPTS,
  LIBRARY_STYLESHEET,
  LIBRARY_VERIFY,
  MODAL_SHOW,
  PINNED_SCHEME,
  POPOVER_ATTRIBUTES,
  POPOVER_FIXTURE,
  TAB_BUTTON,
  TAB_KEYS,
  TAB_RULE,
  THEME_BOOT_IMPORTS,
  THEME_NAMES,
  UNCERTAIN_TODO,
};
