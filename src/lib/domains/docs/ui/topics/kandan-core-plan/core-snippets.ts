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
];

export {
  ACCORDION_DETAILS,
  ANY_PREFIX,
  APPLY_APPEARANCE,
  CHECK_ICON,
  CORE_SNIPPETS,
  DESIGN_SPEC_IMPORTS,
  DROPZONE_FOCUS,
  FONT_FOLDER,
  FONT_URL,
  ICON_SVG,
  LAYER_IMPORTS,
  LIBRARY_STYLESHEET,
  MODAL_SHOW,
  PINNED_SCHEME,
  POPOVER_ATTRIBUTES,
  TAB_BUTTON,
  TAB_KEYS,
  THEME_BOOT_IMPORTS,
  THEME_NAMES,
};
