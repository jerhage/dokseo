import { match } from 'ts-pattern';

type CoreFate = 'core' | 'svelte' | 'both' | 'work';

type InventoryRow = {
  readonly path: string;
  readonly fate: CoreFate;
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
    note: 'Plain CSS: reset, tokens, themes, base, component classes, utilities and overrides, joined by relative @import statements in index.css.',
  },
  {
    path: 'fonts/',
    fate: 'core',
    note: 'woff2 files and their OFL licenses. fonts.css names them by URLs relative to itself.',
  },
  {
    path: 'appearance.ts',
    fate: 'work',
    note: 'No Svelte, but TypeScript, and pinnedScheme uses match from ts-pattern.',
  },
  {
    path: 'appearance.spec.ts',
    fate: 'core',
    note: 'Moves with appearance.ts; it reads the theme stylesheets to check THEMES.',
  },
  {
    path: 'theme-boot.ts',
    fate: 'work',
    note: 'No Svelte; imports only appearance.ts. TypeScript, like it.',
  },
  {
    path: 'theme-boot.spec.ts',
    fate: 'core',
    note: 'Moves with theme-boot.ts.',
  },
  {
    path: 'styles/design-system.spec.ts',
    fate: 'work',
    note: 'Reads only CSS, but imports NARROW_SCREEN_QUERY from components/breakpoints.ts and TAG_COLOURS from components/classes.ts.',
  },
  {
    path: 'styles/markup-classes.spec.ts',
    fate: 'svelte',
    note: 'Reads the class names written in .svelte files.',
  },
  {
    path: 'styles/source-styling.spec.ts',
    fate: 'work',
    note: 'Mixed: no <style> block in Svelte files and the playground stylesheets stay with Svelte; the legacy custom property check reads CSS too.',
  },
  {
    path: 'components/icons/',
    fate: 'work',
    note: 'Lucide icons written by hand as Svelte components. The SVG source and Lucide’s license move to the core; the components are generated from it.',
  },
  {
    path: 'components/breakpoints.ts',
    fate: 'work',
    note: 'The query widths the stylesheets use; the core needs them for its own spec.',
  },
  {
    path: 'components/classes.ts',
    fate: 'work',
    note: 'Class names per variant. The vocabulary, such as TAG_COLOURS, is the core’s; the maps from props to classes stay with the components.',
  },
  {
    path: 'components/*.svelte',
    fate: 'svelte',
    note: 'The components. Their markup is what the core’s fixtures describe.',
  },
  {
    path: 'components/*.ts',
    fate: 'svelte',
    note: 'Helpers. Most import no Svelte, so kandan-ui-vanilla can start from copies of them.',
  },
  {
    path: 'components/*.spec.ts',
    fate: 'svelte',
    note: 'Component and helper specs; many already render with svelte/server.',
  },
  {
    path: 'playground/',
    fate: 'svelte',
    note: 'Svelte sections and a Playground component; it uses import.meta.glob, so it needs Vite. kandan-ui-vanilla gets a static page instead.',
  },
  {
    path: 'library-files.ts',
    fate: 'both',
    note: 'A Node helper that lists the library’s files for specs; each repository needs one.',
  },
  {
    path: 'library-files.spec.ts',
    fate: 'both',
    note: 'Moves with library-files.ts.',
  },
  {
    path: 'README.md',
    fate: 'both',
    note: 'Each repository has its own.',
  },
  {
    path: 'GUIDE.md',
    fate: 'both',
    note: 'Each repository has its own; the integration steps for CSS, fonts and the attribute contract move to the core’s.',
  },
  {
    path: 'package.json',
    fate: 'svelte',
    note: 'Declares svelte, ts-pattern and the Svelte tooling. The core needs its own, smaller one.',
  },
  {
    path: 'vitest.config.ts',
    fate: 'svelte',
    note: 'The Svelte version’s test runner setup.',
  },
  {
    path: 'tsconfig.json',
    fate: 'svelte',
    note: 'Already sets allowJs and checkJs.',
  },
  {
    path: '.oxlintrc.json',
    fate: 'svelte',
    note: 'Lint settings for the Svelte version.',
  },
  {
    path: '.oxfmtrc.json',
    fate: 'svelte',
    note: 'Format settings for the Svelte version.',
  },
  {
    path: '.gitignore',
    fate: 'svelte',
    note: 'The Svelte version’s ignore list.',
  },
];

const COMPONENTS = [
  'Accordion',
  'AccordionItem',
  'Alert',
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
  'CommandItem',
  'Diagram',
  'Divider',
  'Dock',
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
  'WindowDropzone',
] as const;

const ICON_COUNT = 37;

const SERVER_RENDER_SPEC_COUNT = 24;

const CORE_PATH = /lib\/ui\/(styles|fonts|appearance|theme-boot)/u;

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
  'src/lib/domains/viewing/ui/viewer-drag.svelte.spec.ts',
  'src/lib/shared/AppearanceChoices.svelte',
  'src/lib/shared/AppearanceSwitcher.svelte',
  'src/lib/shared/appearance-labels.ts',
  'src/lib/shared/saved-appearance.spec.ts',
  'src/lib/shared/saved-appearance.ts',
  'src/lib/shared/toast-top-layer.svelte.spec.ts',
  'src/routes/+layout.svelte',
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
  BEHAVIOURS,
  COMPONENTS,
  CORE_PATH,
  DOKSEO_FILES_NAMING_CORE_PATHS,
  ICON_COUNT,
  INVENTORY,
  LIBRARY_ROOT,
  SERVER_RENDER_SPEC_COUNT,
  behaviourCount,
  behaviourLabel,
  behaviourOf,
  fateCount,
  fateLabel,
};
export type { BehaviourRow, ComponentBehaviour, CoreFate, InventoryRow };
