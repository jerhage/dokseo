import type { SourceSnippet } from '../ocr/ocr-snippets';

const PRIMITIVE_NAMES = {
  prefix: '--ds-',
  spruce: '--ds-spruce-500',
  primary: '--ds-primary',
  radiusControl: '--ds-radius-control',
  sizeNarrow: '--ds-size-narrow',
  space4Reference: 'var(--ds-space-4)',
} as const;

const ORDER_STATEMENT: SourceSnippet = {
  label: 'src/app.html',
  file: 'src/app.html',
  code: `<style>
  @layer open-props, reset, base, tokens, components, features, utilities, overrides;
</style>`,
};

const IMPORTS_FIRST: SourceSnippet = {
  label: 'src/lib/ui/core/styles/index.css, its first imports',
  file: 'src/lib/ui/core/styles/index.css',
  code: `@import 'reset.css' layer(reset);

@import 'base/fonts.css' layer(base);
@import 'base/primitives.css' layer(base);
@import 'base/scheme.css' layer(base);
@import 'base/themes/base.css' layer(base);`,
};

const IMPORTS_MIDDLE: SourceSnippet = {
  label: 'src/lib/ui/core/styles/index.css, where the tokens end and the components start',
  file: 'src/lib/ui/core/styles/index.css',
  code: `@import 'tokens/opacity.css' layer(tokens);

@import 'components/icon.css' layer(components);
@import 'components/btn.css' layer(components);`,
};

const IMPORTS_LAST: SourceSnippet = {
  label: 'src/lib/ui/core/styles/index.css, its last imports',
  file: 'src/lib/ui/core/styles/index.css',
  code: `@import 'utilities/text.css' layer(utilities);
@import 'utilities/animation.css' layer(utilities);

@import 'overrides/overrides.css' layer(overrides);`,
};

const BASE_PALETTE: SourceSnippet = {
  label: 'src/lib/ui/core/styles/base/themes/base.css, a palette color in its first :root rule',
  file: 'src/lib/ui/core/styles/base/themes/base.css',
  code: `--ds-spruce-500: light-dark(oklch(0.52 0.1 195), oklch(0.74 0.11 195));`,
};

const BASE_ROLES: SourceSnippet = {
  label: 'src/lib/ui/core/styles/base/themes/base.css, the start of its second rule',
  file: 'src/lib/ui/core/styles/base/themes/base.css',
  code: `:root,
:root[data-theme='base'] {
  --ds-bg: var(--ds-slate-25);
  --ds-bg-raised: var(--ds-slate-50);
  --ds-surface: light-dark(oklch(1 0 0), oklch(0.18 0.01 255));
  --ds-surface-raised: light-dark(oklch(1 0 0), oklch(0.22 0.012 255));
  --ds-surface-bright: light-dark(oklch(1 0 0), oklch(0.28 0.013 255));
  --ds-surface-sunken: light-dark(oklch(0.97 0.004 255), oklch(0.13 0.008 255));

  --ds-primary: var(--ds-spruce-500);`,
};

const EMBER_PALETTE: SourceSnippet = {
  label: 'src/lib/ui/core/styles/base/themes/ember.css, a palette color in its first rule',
  file: 'src/lib/ui/core/styles/base/themes/ember.css',
  code: `--ds-copper-500: light-dark(oklch(0.6 0.16 40), oklch(0.72 0.15 45));`,
};

const EMBER_ROLES: SourceSnippet = {
  label: 'src/lib/ui/core/styles/base/themes/ember.css, the start of its second rule',
  file: 'src/lib/ui/core/styles/base/themes/ember.css',
  code: `:root[data-theme='ember'] {
  --ds-bg: light-dark(oklch(0.975 0.01 78), oklch(0.17 0.011 50));
  --ds-bg-raised: var(--ds-sand-50);
  --ds-surface: light-dark(oklch(0.995 0.004 80), oklch(0.2 0.013 50));
  --ds-surface-raised: light-dark(oklch(0.995 0.004 80), oklch(0.24 0.015 50));
  --ds-surface-bright: light-dark(oklch(0.995 0.004 80), oklch(0.24 0.015 50));
  --ds-surface-sunken: light-dark(oklch(0.955 0.013 75), oklch(0.15 0.01 50));

  --ds-primary: var(--ds-copper-500);`,
};

const SEMANTIC_COLOR: SourceSnippet = {
  label: 'src/lib/ui/core/styles/tokens/colors.css, one line',
  file: 'src/lib/ui/core/styles/tokens/colors.css',
  code: `--color-primary: var(--ds-primary);`,
};

const SEMANTIC_SPACE: SourceSnippet = {
  label: 'src/lib/ui/core/styles/tokens/spacing.css, one line',
  file: 'src/lib/ui/core/styles/tokens/spacing.css',
  code: `--sp-4: var(--ds-space-4);`,
};

const SEMANTIC_RADIUS: SourceSnippet = {
  label: 'src/lib/ui/core/styles/tokens/radius.css, one line',
  file: 'src/lib/ui/core/styles/tokens/radius.css',
  code: `--radius-control: var(--ds-radius-control);`,
};

const BUTTON_TONE: SourceSnippet = {
  label: 'src/lib/ui/core/styles/components/btn.css, the start of .btn-primary',
  file: 'src/lib/ui/core/styles/components/btn.css',
  code: `.btn-primary {
  --_btn-tone-fg: var(--color-text-on-primary);
  --_btn-tone-bg: var(--color-primary);
  --_btn-tone-border: var(--color-primary);`,
};

const REGISTERED: SourceSnippet = {
  label: 'src/lib/ui/core/styles/tokens/spacing.css, the registration',
  file: 'src/lib/ui/core/styles/tokens/spacing.css',
  code: `@property --carousel-gap {
  syntax: '<length>';
  inherits: true;
  initial-value: 0px;
}`,
};

const REGISTERED_VALUE: SourceSnippet = {
  label: 'src/lib/ui/core/styles/tokens/spacing.css, the value, in the :root rule',
  file: 'src/lib/ui/core/styles/tokens/spacing.css',
  code: `--carousel-gap: var(--ds-space-4);`,
};

const PIXEL_LENGTH: SourceSnippet = {
  label: 'src/lib/ui/components/css-length.ts',
  file: 'src/lib/ui/components/css-length.ts',
  code: `function pixelLength(style: StyleSource, property: string): number {
  const parsed = Number.parseFloat(style.getPropertyValue(property));
  return Number.isFinite(parsed) ? parsed : 0;
}`,
};

const CLASS_TABLES: SourceSnippet = {
  label: 'src/lib/ui/components/classes.ts, excerpt',
  file: 'src/lib/ui/components/classes.ts',
  code: `const BUTTON_VARIANTS: Readonly<Record<ButtonVariant, ClassList>> = {
  default: [],
  primary: ['btn-primary'],
  accent: ['btn-accent'],
  outline: ['btn-outline', 'btn-primary'],
  ghost: ['btn-ghost'],
  danger: ['btn-danger'],
  'ghost-danger': ['btn-ghost', 'btn-danger'],
};

const BUTTON_SIZES: Readonly<Record<ControlSize, ClassList>> = {
  sm: ['btn-sm'],
  md: [],
  lg: ['btn-lg'],
};`,
};

const RUNTIME_MARKUP: SourceSnippet = {
  label: 'src/lib/domains/viewing/ui/PageFrame.svelte, the binding',
  file: 'src/lib/domains/viewing/ui/PageFrame.svelte',
  code: `<div
  class={[
    'page-frame relative',
    phase === 'shown' ? 'scheme-light surface-bright' : 'surface-raised',
    { 'shadow-md': !flush },
  ]}
  style:--page-ratio={ratio}`,
};

const FEATURE: SourceSnippet = {
  label: 'src/lib/domains/viewing/ui/page-frame.css, the start',
  file: 'src/lib/domains/viewing/ui/page-frame.css',
  code: `@layer features {
  @scope (.page-frame) {
    :scope {
      block-size: 100%;
      aspect-ratio: var(--page-ratio, var(--ratio-portrait));
    }
    .picture {
      position: absolute;
      inset: 0;
    }`,
};

const SCHEME: SourceSnippet = {
  label: 'src/lib/ui/core/styles/base/scheme.css, excerpt',
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

const SCHEME_UTILITIES: SourceSnippet = {
  label: 'src/lib/ui/core/styles/utilities/surface.css, excerpt',
  file: 'src/lib/ui/core/styles/utilities/surface.css',
  code: `.scheme-light {
  color-scheme: light;
  color: var(--color-text);
}
.scheme-dark {
  color-scheme: dark;
  color: var(--color-text);
}`,
};

const FRAME: SourceSnippet = {
  label: 'ThemeFrame.svelte, the mount step',
  file: 'src/lib/domains/docs/ui/topics/ui-library/ThemeFrame.svelte',
  code: `const inner = frame.contentDocument;
if (inner === null) return () => {};
for (const node of Array.from(document.head.querySelectorAll(PAGE_STYLES)))
  inner.head.append(node.cloneNode(true));
inner.body.classList.add('surface-bg', 'p-4');
applyAppearance(
  inner.documentElement,
  untrack(() => appearance),
);
frameRoot = inner.documentElement;
const specimen = mount(ThemeSpecimen, { target: inner.body });`,
};

const SHELL: SourceSnippet = {
  label: 'src/lib/ui/core/styles/utilities/layout.css, the start of .layout-app-shell',
  file: 'src/lib/ui/core/styles/utilities/layout.css',
  code: `.layout-app-shell {
  container: app-shell / inline-size;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);`,
};

const SHELL_NARROW: SourceSnippet = {
  label: 'src/lib/ui/core/styles/utilities/layout.css, the start of the narrow query',
  file: 'src/lib/ui/core/styles/utilities/layout.css',
  code: `@container app-shell (max-width: 48rem) {
  .layout-app-shell-nav {
    grid-column: 1 / -1;
    grid-row: 2;
    flex-direction: row;`,
};

const RULE_NAME: SourceSnippet = {
  label: '.dependency-cruiser.cjs, the rule’s name',
  file: '.dependency-cruiser.cjs',
  code: `name: 'base-components-know-no-app',`,
};

const RULE_PATHS: SourceSnippet = {
  label: '.dependency-cruiser.cjs, the rest of the rule after its comment',
  file: '.dependency-cruiser.cjs',
  code: `severity: 'error',
  from: { path: '^src/lib/ui/' },
  to: {
    path: ['^src/', '(^|/)node_modules/'],
    pathNot: ['^src/lib/ui/', '(^|/)node_modules/(svelte|ts-pattern|vitest)/'],
  },
},`,
};

const TOKEN_DIAGRAM_LABEL =
  'The palette color --ds-spruce-500 is assigned to the role primitive --ds-primary, which is mapped to the semantic token --color-primary, which the .btn-primary class reads';

const UI_LIBRARY_SNIPPETS: readonly SourceSnippet[] = [
  ORDER_STATEMENT,
  IMPORTS_FIRST,
  IMPORTS_MIDDLE,
  IMPORTS_LAST,
  BASE_PALETTE,
  BASE_ROLES,
  EMBER_PALETTE,
  EMBER_ROLES,
  SEMANTIC_COLOR,
  SEMANTIC_SPACE,
  SEMANTIC_RADIUS,
  BUTTON_TONE,
  REGISTERED,
  REGISTERED_VALUE,
  PIXEL_LENGTH,
  CLASS_TABLES,
  RUNTIME_MARKUP,
  FEATURE,
  SCHEME,
  SCHEME_UTILITIES,
  FRAME,
  SHELL,
  SHELL_NARROW,
  RULE_NAME,
  RULE_PATHS,
];

export {
  BASE_PALETTE,
  BASE_ROLES,
  BUTTON_TONE,
  CLASS_TABLES,
  EMBER_PALETTE,
  EMBER_ROLES,
  FEATURE,
  FRAME,
  IMPORTS_FIRST,
  IMPORTS_LAST,
  IMPORTS_MIDDLE,
  ORDER_STATEMENT,
  PIXEL_LENGTH,
  PRIMITIVE_NAMES,
  REGISTERED,
  REGISTERED_VALUE,
  RULE_NAME,
  RULE_PATHS,
  RUNTIME_MARKUP,
  SCHEME,
  SCHEME_UTILITIES,
  SEMANTIC_COLOR,
  SEMANTIC_RADIUS,
  SEMANTIC_SPACE,
  SHELL,
  SHELL_NARROW,
  TOKEN_DIAGRAM_LABEL,
  UI_LIBRARY_SNIPPETS,
};
