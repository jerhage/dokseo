type TokenGroup = {
  readonly title: string;
  readonly tokens: readonly string[];
};

const COLOR_GROUPS: readonly TokenGroup[] = [
  {
    title: 'Surfaces',
    tokens: [
      '--color-bg',
      '--color-bg-raised',
      '--color-surface',
      '--color-surface-raised',
      '--color-surface-sunken',
      '--color-surface-bright',
    ],
  },
  {
    title: 'Primary',
    tokens: [
      '--color-primary',
      '--color-primary-subtle',
      '--color-primary-soft',
      '--color-primary-muted',
      '--color-primary-hover',
      '--color-primary-glow',
    ],
  },
  {
    title: 'Accent',
    tokens: [
      '--color-accent',
      '--color-accent-surface',
      '--color-accent-border',
      '--color-accent-mid',
      '--color-accent-text',
      '--color-accent-hover',
      '--color-accent-glow',
    ],
  },
  {
    title: 'Brand',
    tokens: [
      '--color-brand-tint',
      '--color-brand-border',
      '--color-brand-border-mid',
      '--color-brand-text',
    ],
  },
  {
    title: 'Status',
    tokens: [
      '--color-success',
      '--color-success-bg',
      '--color-success-border',
      '--color-success-muted',
      '--color-warning',
      '--color-warning-bg',
      '--color-warning-border',
      '--color-warning-muted',
      '--color-danger',
      '--color-danger-bg',
      '--color-danger-border',
      '--color-danger-muted',
      '--color-info',
      '--color-info-bg',
      '--color-info-border',
      '--color-info-muted',
    ],
  },
  {
    title: 'Text',
    tokens: [
      '--color-text',
      '--color-text-muted',
      '--color-text-faint',
      '--color-text-inverse',
      '--color-text-link',
      '--color-text-link-hover',
      '--color-text-on-primary',
      '--color-text-on-accent',
      '--color-text-on-scrim',
    ],
  },
  {
    title: 'Interactive states',
    tokens: [
      '--color-hover',
      '--color-active',
      '--color-selected',
      '--color-disabled',
      '--color-disabled-bg',
    ],
  },
  {
    title: 'Component surfaces',
    tokens: [
      '--color-table-stripe',
      '--color-table-row-hover',
      '--color-skeleton-base',
      '--color-skeleton-shine',
      '--color-code-bg',
      '--color-code-text',
    ],
  },
  {
    title: 'Borders',
    tokens: ['--border-color', '--border-color-strong', '--border-color-focus'],
  },
  {
    title: 'Utility',
    tokens: ['--color-overlay', '--color-overlay-heavy', '--color-scrim', '--color-spinner-track'],
  },
];

const TYPE_SCALE: readonly string[] = [
  '--text-5xl',
  '--text-4xl',
  '--text-3xl',
  '--text-2xl',
  '--text-xl',
  '--text-lg',
  '--text-md',
  '--text-base',
  '--text-sm',
  '--text-xs',
  '--text-2xs',
  '--text-xxs',
];

const FONT_FAMILIES: readonly string[] = [
  '--font-display',
  '--font-body',
  '--font-mono',
  '--font-ja',
  '--font-ko',
];

const SPACING: readonly string[] = [
  '--sp-1',
  '--sp-2',
  '--sp-3',
  '--sp-4',
  '--sp-5',
  '--sp-6',
  '--sp-7',
  '--sp-8',
  '--sp-9',
  '--sp-10',
];

const RADII: readonly string[] = [
  '--radius-none',
  '--radius-xs',
  '--radius-sm',
  '--radius-md',
  '--radius-lg',
  '--radius-xl',
  '--radius-2xl',
  '--radius-full',
  '--radius-control',
  '--radius-container',
  '--radius-overlay',
];

const SHADOWS: readonly string[] = [
  '--shadow-sm',
  '--shadow-md',
  '--shadow-lg',
  '--shadow-xl',
  '--shadow-inset',
];

const OPACITIES: readonly string[] = ['--opacity-muted', '--opacity-disabled'];

const Z_SCALE: readonly string[] = [
  '--z-base',
  '--z-raised',
  '--z-dropdown',
  '--z-sticky',
  '--z-overlay',
  '--z-modal',
  '--z-toast',
  '--z-tooltip',
];

export { COLOR_GROUPS, FONT_FAMILIES, OPACITIES, RADII, SHADOWS, SPACING, TYPE_SCALE, Z_SCALE };
export type { TokenGroup };
