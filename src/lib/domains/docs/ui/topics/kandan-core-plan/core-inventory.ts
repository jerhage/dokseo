import { match } from 'ts-pattern';

type CoreFate = 'core' | 'svelte' | 'both' | 'work';

type InventoryRow = {
  readonly path: string;
  readonly fate: CoreFate;
  readonly now: readonly string[];
  readonly note: string;
};

type AddedRow = {
  readonly path: string;
  readonly note: string;
};

type ComponentBehaviour = 'markup' | 'native' | 'native-script' | 'script';

type BehaviourRow = {
  readonly component: string;
  readonly behaviour: Exclude<ComponentBehaviour, 'markup'>;
  readonly note: string;
};

const LIBRARY_ROOT = 'src/lib/ui';

const INVENTORY: readonly InventoryRow[] = [
  {
    path: 'styles/',
    fate: 'core',
    now: ['core/styles/'],
    note: 'Plain CSS: reset, tokens, themes, base, component classes, utilities and overrides, joined by relative @import statements in index.css.',
  },
  {
    path: 'fonts/',
    fate: 'core',
    now: ['core/fonts/'],
    note: 'woff2 files and their OFL licenses. fonts.css names them by URLs relative to itself.',
  },
  {
    path: 'appearance.ts',
    fate: 'work',
    now: ['core/appearance.js'],
    note: 'No Svelte, but TypeScript, and pinnedScheme used match from ts-pattern.',
  },
  {
    path: 'appearance.spec.ts',
    fate: 'core',
    now: ['core/appearance.test.js'],
    note: 'Moved with appearance.ts; it reads the theme stylesheets to check THEMES.',
  },
  {
    path: 'theme-boot.ts',
    fate: 'work',
    now: ['core/theme-boot.js'],
    note: 'No Svelte; imported only appearance.ts. TypeScript, like it.',
  },
  {
    path: 'theme-boot.spec.ts',
    fate: 'core',
    now: ['core/theme-boot.test.js'],
    note: 'Moved with theme-boot.ts.',
  },
  {
    path: 'styles/design-system.spec.ts',
    fate: 'work',
    now: ['core/styles/design-system.test.js'],
    note: 'Read only CSS, but imported NARROW_SCREEN_QUERY from components/breakpoints.ts and TAG_COLOURS from components/classes.ts.',
  },
  {
    path: 'styles/markup-classes.spec.ts',
    fate: 'svelte',
    now: ['markup-classes.spec.ts'],
    note: 'Reads the class names written in .svelte files.',
  },
  {
    path: 'styles/source-styling.spec.ts',
    fate: 'work',
    now: ['source-styling.spec.ts', 'core/styles/source-styling.test.js'],
    note: 'Mixed: no <style> block in Svelte files and the playground stylesheets stayed with Svelte; the legacy custom property check reads CSS too.',
  },
  {
    path: 'components/icons/',
    fate: 'work',
    now: ['components/icons/', 'core/icons/'],
    note: 'Lucide icons written by hand as Svelte components. The SVG sources and Lucide’s license moved to the core; the components are generated from them.',
  },
  {
    path: 'components/breakpoints.ts',
    fate: 'work',
    now: ['core/breakpoints.js'],
    note: 'The query widths the stylesheets use; the core needs them for its own spec.',
  },
  {
    path: 'components/classes.ts',
    fate: 'work',
    now: ['components/classes.ts', 'core/tag-colours.js'],
    note: 'Class names per variant. The vocabulary, TAG_COLOURS, went to the core; the maps from props to classes stayed with the components.',
  },
  {
    path: 'components/*.svelte',
    fate: 'svelte',
    now: ['components/*.svelte'],
    note: 'The components. Their markup is what the core’s fixtures describe.',
  },
  {
    path: 'components/*.ts',
    fate: 'svelte',
    now: ['components/*.ts'],
    note: 'Helpers. Most import no Svelte, so kandan-ui-vanilla can start from copies of them.',
  },
  {
    path: 'components/*.spec.ts',
    fate: 'svelte',
    now: ['components/*.spec.ts'],
    note: 'Component and helper specs; many render with svelte/server.',
  },
  {
    path: 'playground/',
    fate: 'svelte',
    now: ['playground/'],
    note: 'Svelte sections and a Playground component; it uses import.meta.glob, so it needs Vite. kandan-ui-vanilla gets a static page instead.',
  },
  {
    path: 'library-files.ts',
    fate: 'both',
    now: ['library-files.ts', 'core/library-files.js'],
    note: 'A Node helper that lists the library’s files for specs; each repository has one.',
  },
  {
    path: 'library-files.spec.ts',
    fate: 'both',
    now: ['library-files.spec.ts', 'core/library-files.test.js'],
    note: 'Moved with library-files.ts.',
  },
  {
    path: 'README.md',
    fate: 'both',
    now: ['README.md', 'core/README.md'],
    note: 'Each repository has its own.',
  },
  {
    path: 'GUIDE.md',
    fate: 'both',
    now: ['GUIDE.md', 'core/GUIDE.md'],
    note: 'Each repository has its own; the integration steps for CSS, fonts and the attribute contract are in the core’s.',
  },
  {
    path: 'package.json',
    fate: 'svelte',
    now: ['package.json', 'package-lock.json', 'core/package.json', 'core/package-lock.json'],
    note: 'Declares svelte, ts-pattern and the Svelte tooling. The core has its own, smaller one.',
  },
  {
    path: 'vitest.config.ts',
    fate: 'svelte',
    now: ['vitest.config.ts'],
    note: 'The Svelte version’s test runner setup.',
  },
  {
    path: 'tsconfig.json',
    fate: 'svelte',
    now: ['tsconfig.json', 'core/jsconfig.json'],
    note: 'Already set allowJs and checkJs. The core checks its JSDoc types with its own jsconfig.json.',
  },
  {
    path: '.oxlintrc.json',
    fate: 'svelte',
    now: ['.oxlintrc.json'],
    note: 'Lint settings for the Svelte version.',
  },
  {
    path: '.oxfmtrc.json',
    fate: 'svelte',
    now: ['.oxfmtrc.json'],
    note: 'Format settings for the Svelte version.',
  },
  {
    path: '.gitignore',
    fate: 'svelte',
    now: ['.gitignore', 'core/.gitignore'],
    note: 'The Svelte version’s ignore list; the core has its own.',
  },
];

const ADDED: readonly AddedRow[] = [
  {
    path: 'core/fixtures/',
    note: 'The markup contract: one HTML file per component and variant.',
  },
  {
    path: 'core/rules/',
    note: 'The behavior rules as JSON, one file per component that needs a native element or a script, with the schema and the spec that checks their form.',
  },
  {
    path: 'core/contract/',
    note: 'The normalizer and the comparison both framework versions use.',
  },
  {
    path: 'core/LICENSE',
    note: 'The core’s MIT license.',
  },
  {
    path: 'contract/',
    note: 'The Svelte cases for every fixture, the contract spec, and the rule subjects with their specs.',
  },
  {
    path: 'scripts/',
    note: 'The script that writes the icon components from the core’s SVG files.',
  },
  {
    path: 'vitest.browser.config.ts',
    note: 'The browser project that runs the behavior rules, kept out of test and verify.',
  },
  {
    path: 'vite.config.ts',
    note: 'The dev server that renders only the playground (npm run dev); Vitest keeps reading vitest.config.ts.',
  },
  {
    path: '.github/',
    note: 'The library’s CI workflow.',
  },
  {
    path: 'LICENSE',
    note: 'The library’s MIT license.',
  },
];

const COMPONENTS = [
  'Accordion',
  'AccordionItem',
  'Alert',
  'AppearanceChoices',
  'AppearanceSwitcher',
  'Avatar',
  'AvatarStack',
  'Badge',
  'Breadcrumb',
  'BreakpointProbe',
  'Button',
  'ButtonGroup',
  'Card',
  'Carousel',
  'Checkbox',
  'ChromeBar',
  'CodeBlock',
  'Combobox',
  'CommandItem',
  'ContextMenu',
  'Diagram',
  'Divider',
  'Dock',
  'Drawer',
  'Dropdown',
  'DropdownItem',
  'DropdownLabel',
  'DropdownSeparator',
  'Dropzone',
  'EmptyState',
  'Field',
  'Fieldset',
  'Figure',
  'FileItem',
  'FileList',
  'Highlight',
  'IconButton',
  'Input',
  'InputGroup',
  'InputGroupAddon',
  'KeyHints',
  'ListGroup',
  'ListRow',
  'MarqueeSelection',
  'Modal',
  'NavLink',
  'OverflowList',
  'PageHeader',
  'Pagination',
  'Popover',
  'Progress',
  'Radio',
  'SearchField',
  'SegmentedControl',
  'Select',
  'SettingsRow',
  'Skeleton',
  'Slider',
  'Stat',
  'StatusIcon',
  'StepItem',
  'StepList',
  'Stepper',
  'Table',
  'TableBody',
  'TableCell',
  'TableHeader',
  'TableHeaderCell',
  'TableOfContents',
  'TableRow',
  'Tabs',
  'Tag',
  'TagToggle',
  'Textarea',
  'Thumbnail',
  'Toast',
  'ToastClearance',
  'ToastRegion',
  'Toggle',
  'Tooltip',
  'WindowDropzone',
] as const;

const ICON_COUNT = 38;

const SERVER_RENDER_SPEC_COUNT = 26;

const FIXTURE_COUNT = 347;

const RULE_FILE_COUNT = 21;

const RULE_COUNT = 99;

const UNCERTAIN_RULE_COUNT = 0;

const FIRST_COMPONENT_COUNT = 75;

const FIRST_FIXTURE_COUNT = 329;

const FIRST_RULE_FILE_COUNT = 15;

const FIRST_RULE_COUNT = 60;

const FIRST_UNCERTAIN_RULE_COUNT = 5;

const PLANNED_DOKSEO_FILE_COUNT = 20;

const CORE_TEST_FILES = [
  'appearance.test.js',
  'theme-boot.test.js',
  'contract/compare.test.js',
  'contract/format.test.js',
  'contract/normalize.test.js',
  'fixtures/fixtures.test.js',
  'rules/rules.test.js',
  'icons/icons.test.js',
  'styles/design-system.test.js',
  'styles/source-styling.test.js',
  'library-files.test.js',
] as const;

function fixtureFolder(component: string): string {
  return component.replaceAll(/(?<=[a-z0-9])(?=[A-Z])/gu, '-').toLowerCase();
}

const CORE_PATH = /ui\/core\//u;

const DOKSEO_FILES_NAMING_CORE_PATHS = [
  'src/app-rules/design-system.spec.ts',
  'src/app-rules/markup-classes.spec.ts',
  'src/app-rules/theme-before-first-paint.spec.ts',
  'src/lib/domains/flowing/ui/flow-lift.svelte.spec.ts',
  'src/lib/domains/flowing/ui/flow-refresh.svelte.spec.ts',
  'src/lib/domains/flowing/ui/flow-shortcuts.svelte.spec.ts',
  'src/lib/domains/flowing/ui/flow-tap.svelte.spec.ts',
  'src/lib/domains/flowing/ui/flow-touch-turn.svelte.spec.ts',
  'src/lib/domains/library/ui/LibraryMenu.svelte',
  'src/lib/domains/recognition/domain/tag/tag-colour.spec.ts',
  'src/lib/domains/recognition/ui/capture/SearchDialog.svelte',
  'src/lib/domains/recognition/ui/capture/tag-colours.spec.ts',
  'src/lib/domains/viewing/ui/viewer-drag.svelte.spec.ts',
  'src/lib/shared/AppearanceSwitcher.svelte',
  'src/lib/shared/saved-appearance.spec.ts',
  'src/lib/shared/saved-appearance.ts',
  'src/lib/shared/toast-top-layer.svelte.spec.ts',
  'src/routes/+layout.svelte',
  'src/routes/settings/+page.svelte',
  'src/routes/settings/AppearanceSettings.svelte',
  'src/routes/settings/appearance-options.ts',
  'vite.config.ts',
] as const;

const BEHAVIOURS: readonly BehaviourRow[] = [
  {
    component: 'AccordionItem',
    behaviour: 'native',
    note: '<details> and <summary> open and close with no script.',
  },
  {
    component: 'Modal',
    behaviour: 'native-script',
    note: '<dialog> with showModal(); script focuses an [autofocus] element or the close button, wraps Tab when asked, waits for the closing animation and closes on a backdrop click.',
  },
  {
    component: 'Popover',
    behaviour: 'native-script',
    note: 'popover="auto" with a popovertarget trigger; script places the sheet beside its anchor and follows it.',
  },
  {
    component: 'AppearanceChoices',
    behaviour: 'script',
    note: 'A choice moves the selection and reports the new appearance through onchoose; the default is prevented so the menu stays open.',
  },
  {
    component: 'AppearanceSwitcher',
    behaviour: 'native-script',
    note: 'A Dropdown whose trigger shows the scheme icon and the theme, holding the appearance choices.',
  },
  {
    component: 'Combobox',
    behaviour: 'native-script',
    note: 'A text field with a popover="manual" listbox; script filters the options, moves the active option with the arrow keys and chooses one on Enter or a click.',
  },
  {
    component: 'ContextMenu',
    behaviour: 'native-script',
    note: 'A popover="manual" menu of dropdown items; script opens it at the pointer on a secondary click, or at the focused element on Shift+F10, and returns focus on close.',
  },
  {
    component: 'Drawer',
    behaviour: 'native-script',
    note: '<dialog> with showModal() that slides in from an edge; script focuses the close button and waits for the closing animation, as the modal does.',
  },
  {
    component: 'Dropdown',
    behaviour: 'native-script',
    note: 'A popover menu; script places it and moves focus between items with the arrow keys.',
  },
  {
    component: 'ToastRegion',
    behaviour: 'native-script',
    note: 'A popover puts the toasts in the top layer; when another element enters the top layer, script hides and shows it again so the toasts stay above.',
  },
  {
    component: 'WindowDropzone',
    behaviour: 'native-script',
    note: 'A popover overlay; script follows drag events on the window.',
  },
  {
    component: 'Tooltip',
    behaviour: 'native-script',
    note: 'popover="hint" with role="tooltip"; script shows it after a hover delay or at once on focus, places it above its trigger and hides it on Escape, leave and blur.',
  },
  {
    component: 'Tabs',
    behaviour: 'script',
    note: 'Arrow keys move between tabs (roving tabindex); aria-selected follows the shown tab.',
  },
  {
    component: 'Carousel',
    behaviour: 'script',
    note: 'Pointer events drag the slides.',
  },
  {
    component: 'Dock',
    behaviour: 'script',
    note: 'Pointer events drag the sheet; the handle has a key handler.',
  },
  {
    component: 'Toast',
    behaviour: 'script',
    note: 'A timer dismisses it; hover and focus pause the timer.',
  },
  {
    component: 'ToastClearance',
    behaviour: 'script',
    note: 'An effect reserves space at the block end with the toaster.',
  },
  {
    component: 'MarqueeSelection',
    behaviour: 'script',
    note: 'A pointer drag draws a selection rectangle.',
  },
  {
    component: 'Dropzone',
    behaviour: 'script',
    note: 'Drag and drop events, and reading the dropped files and folders.',
  },
  {
    component: 'CodeBlock',
    behaviour: 'script',
    note: 'The copy button reads the block’s text.',
  },
  {
    component: 'SearchField',
    behaviour: 'script',
    note: 'The clear button empties the field and keeps focus in it.',
  },
];

function fateLabel(fate: CoreFate): string {
  return match(fate)
    .with('core', () => 'Core')
    .with('svelte', () => 'Svelte only')
    .with('both', () => 'Both')
    .with('work', () => 'Needs work')
    .exhaustive();
}

function behaviourLabel(behaviour: ComponentBehaviour): string {
  return match(behaviour)
    .with('markup', () => 'Markup only')
    .with('native', () => 'A native element')
    .with('native-script', () => 'A native element and a script')
    .with('script', () => 'A script')
    .exhaustive();
}

function behaviourOf(component: string): ComponentBehaviour {
  return BEHAVIOURS.find((row) => row.component === component)?.behaviour ?? 'markup';
}

function behaviourCount(behaviour: ComponentBehaviour): number {
  return COMPONENTS.filter((component) => behaviourOf(component) === behaviour).length;
}

function fateCount(fate: CoreFate): number {
  return INVENTORY.filter((row) => row.fate === fate).length;
}

export {
  ADDED,
  BEHAVIOURS,
  COMPONENTS,
  CORE_PATH,
  CORE_TEST_FILES,
  DOKSEO_FILES_NAMING_CORE_PATHS,
  FIXTURE_COUNT,
  ICON_COUNT,
  INVENTORY,
  LIBRARY_ROOT,
  PLANNED_DOKSEO_FILE_COUNT,
  RULE_COUNT,
  RULE_FILE_COUNT,
  SERVER_RENDER_SPEC_COUNT,
  UNCERTAIN_RULE_COUNT,
  FIRST_COMPONENT_COUNT,
  FIRST_FIXTURE_COUNT,
  FIRST_RULE_FILE_COUNT,
  FIRST_RULE_COUNT,
  FIRST_UNCERTAIN_RULE_COUNT,
  behaviourCount,
  behaviourLabel,
  behaviourOf,
  fateCount,
  fateLabel,
  fixtureFolder,
};
export type { AddedRow, BehaviourRow, ComponentBehaviour, CoreFate, InventoryRow };
