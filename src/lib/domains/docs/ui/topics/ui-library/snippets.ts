const PRIMITIVE_NAMES = {
  prefix: '--ds-',
  spruce: '--ds-spruce-500',
  primary: '--ds-primary',
  radiusControl: '--ds-radius-control',
  sizeNarrow: '--ds-size-narrow',
  space4Reference: 'var(--ds-space-4)',
} as const;

const ORDER_STATEMENT = `<style>
  @layer open-props, reset, base, tokens, components, features, utilities, overrides;
</style>`;

const BASE_THEME = `:root {
  --ds-spruce-500: light-dark(oklch(0.52 0.1 195), oklch(0.74 0.11 195));
}

:root,
:root[data-theme='base'] {
  --ds-primary: var(--ds-spruce-500);
}`;

const EMBER_THEME = `:root[data-theme='ember'] {
  --ds-copper-500: light-dark(oklch(0.6 0.16 40), oklch(0.72 0.15 45));
}

:root[data-theme='ember'] {
  --ds-primary: var(--ds-copper-500);
}`;

const SEMANTIC = `:root {
  --color-primary: var(--ds-primary);
  --sp-4: var(--ds-space-4);
  --radius-control: var(--ds-radius-control);
}`;

const REGISTERED = `@property --carousel-gap {
  syntax: '<length>';
  inherits: true;
  initial-value: 0px;
}
:root {
  --carousel-gap: var(--ds-space-4);
}`;

const TOKEN_DIAGRAM_LABEL =
  'The palette color --ds-spruce-500 is assigned to the role primitive --ds-primary, which is mapped to the semantic token --color-primary, which the .btn-primary class reads';

export {
  BASE_THEME,
  EMBER_THEME,
  ORDER_STATEMENT,
  PRIMITIVE_NAMES,
  REGISTERED,
  SEMANTIC,
  TOKEN_DIAGRAM_LABEL,
};
