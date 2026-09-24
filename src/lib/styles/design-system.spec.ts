import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const STYLES = new URL('./', import.meta.url);
const SOURCE = new URL('../../', import.meta.url);
const LEGACY = 'tokens.css';

const CONTRACT_TOKENS = [
  '--color-bg',
  '--color-surface',
  '--color-surface-raised',
  '--color-surface-sunken',
  '--color-bg-raised',
  '--color-surface-bright',
  '--color-primary',
  '--color-primary-subtle',
  '--color-primary-soft',
  '--color-primary-muted',
  '--color-primary-hover',
  '--color-primary-glow',
  '--color-accent',
  '--color-accent-surface',
  '--color-accent-border',
  '--color-accent-mid',
  '--color-accent-text',
  '--color-accent-hover',
  '--color-accent-glow',
  '--color-brand-tint',
  '--color-brand-border',
  '--color-brand-border-mid',
  '--color-brand-text',
  '--color-success',
  '--color-success-bg',
  '--color-success-border',
  '--color-warning',
  '--color-warning-bg',
  '--color-warning-border',
  '--color-danger',
  '--color-danger-bg',
  '--color-danger-border',
  '--color-info',
  '--color-info-bg',
  '--color-info-border',
  '--color-success-muted',
  '--color-warning-muted',
  '--color-danger-muted',
  '--color-info-muted',
  '--color-text',
  '--color-text-muted',
  '--color-text-faint',
  '--color-text-inverse',
  '--color-text-link',
  '--color-text-link-hover',
  '--color-text-on-primary',
  '--color-text-on-accent',
  '--color-hover',
  '--color-active',
  '--color-selected',
  '--color-disabled',
  '--color-disabled-bg',
  '--color-table-stripe',
  '--color-table-row-hover',
  '--color-skeleton-base',
  '--color-skeleton-shine',
  '--color-code-bg',
  '--color-code-text',
  '--border-color',
  '--border-color-strong',
  '--border-color-focus',
  '--focus-ring',
  '--focus-ring-offset',
  '--color-overlay',
  '--color-scrim',
  '--color-spinner-track',
  '--color-overlay-heavy',
  '--font-display',
  '--font-body',
  '--font-mono',
  '--text-xxs',
  '--text-xs',
  '--text-sm',
  '--text-base',
  '--text-md',
  '--text-lg',
  '--text-xl',
  '--text-2xl',
  '--text-3xl',
  '--text-4xl',
  '--text-5xl',
  '--text-2xs',
  '--weight-light',
  '--weight-normal',
  '--weight-medium',
  '--weight-semibold',
  '--weight-bold',
  '--weight-extrabold',
  '--weight-black',
  '--ls-tight',
  '--ls-normal',
  '--ls-wide',
  '--ls-wider',
  '--ls-widest',
  '--lh-none',
  '--lh-tight',
  '--lh-snug',
  '--lh-normal',
  '--lh-relaxed',
  '--lh-loose',
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
  '--radius-none',
  '--radius-xs',
  '--radius-sm',
  '--radius-md',
  '--radius-lg',
  '--radius-xl',
  '--radius-2xl',
  '--radius-full',
  '--container-prose',
  '--container-wide',
  '--layout-hero-height',
  '--layout-row-height',
  '--shadow-sm',
  '--shadow-md',
  '--shadow-lg',
  '--shadow-xl',
  '--shadow-inset',
  '--z-base',
  '--z-raised',
  '--z-dropdown',
  '--z-sticky',
  '--z-overlay',
  '--z-modal',
  '--z-toast',
  '--z-tooltip',
  '--dur-instant',
  '--dur-flash',
  '--dur-quick',
  '--dur-moderate',
  '--dur-slow',
  '--dur-crawl',
  '--dur-long',
  '--ease-smooth',
  '--ease-in',
  '--ease-out',
  '--ease-crisp',
  '--ease-in-out',
  '--ease-in-out-sharp',
  '--ease-spring',
  '--ease-spring-gentle',
  '--ease-bounce',
  '--ease-elastic',
  '--transition-ui',
  '--transition-spring',
  '--transition-enter',
  '--transition-exit',
  '--transition-bounce',
  '--transition-elastic',
];

const LOCKED_Z_SCALE: Readonly<Record<string, string>> = {
  '--ds-z-base': '0',
  '--ds-z-raised': '1',
  '--ds-z-dropdown': '100',
  '--ds-z-sticky': '200',
  '--ds-z-overlay': '300',
  '--ds-z-modal': '400',
  '--ds-z-toast': '500',
  '--ds-z-tooltip': '600',
};

const CONTRACT_CLASSES: Readonly<Record<string, readonly string[]>> = {
  btn: ['btn-primary', 'btn-ghost', 'btn-danger', 'btn-loading', 'btn-sm', 'btn-lg'],
  badge: [
    'badge-success',
    'badge-warning',
    'badge-danger',
    'badge-info',
    'badge-brand',
    'badge-accent',
    'badge-neutral',
  ],
  tag: ['is-active', 'tag-remove'],
  field: ['field-label', 'field-control', 'field-hint', 'field-error'],
  input: [],
  select: [],
  textarea: [],
  'checkbox-wrapper': ['checkbox-input'],
  'radio-wrapper': ['radio-input'],
  toggle: ['toggle-input'],
  card: [
    'card-body',
    'card-eyebrow',
    'card-title',
    'card-description',
    'card-footer',
    'card-feature',
  ],
  alert: ['alert-success', 'alert-warning', 'alert-danger', 'alert-info', 'alert-close'],
  tabs: ['tab-list', 'tab', 'tab-panel', 'is-active'],
  accordion: ['accordion-item', 'accordion-trigger', 'accordion-body'],
  table: [],
  modal: ['modal-backdrop', 'modal-header', 'modal-body', 'modal-footer', 'modal-close'],
  toast: ['toast-success', 'toast-warning', 'toast-danger', 'toast-info'],
  dropdown: ['dropdown-menu', 'dropdown-item', 'dropdown-separator', 'is-open'],
  breadcrumb: ['breadcrumb-item', 'breadcrumb-separator'],
  pagination: ['pagination-item', 'is-active', 'is-disabled'],
  avatar: ['avatar-sm', 'avatar-lg', 'avatar-stack'],
  'progress-track': ['progress-fill', 'progress-success'],
  skeleton: [],
  divider: ['divider-labeled'],
};

const RUNTIME_INPUTS = ['--progress', '--skeleton-width', '--toast-timeout'];

const ANIMATION_KEYWORDS = new Set([
  'none',
  'linear',
  'infinite',
  'both',
  'forwards',
  'backwards',
  'normal',
  'reverse',
  'alternate',
  'alternate-reverse',
  'running',
  'paused',
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'step-start',
  'step-end',
]);

function read(url: URL): string {
  return readFileSync(url, 'utf8');
}

function style(path: string): string {
  return withoutComments(read(new URL(path, STYLES)));
}

function group(found: RegExpMatchArray, index: number): string {
  return found[index] ?? '';
}

function withoutComments(css: string): string {
  return css.replaceAll(/\/\*[\s\S]*?\*\//gu, '');
}

function filesUnder(root: URL, extensions: readonly string[]): readonly string[] {
  return readdirSync(root, { recursive: true, encoding: 'utf8' })
    .filter((path) => extensions.some((extension) => path.endsWith(extension)))
    .map((path) => path.split('\\').join('/'))
    .toSorted();
}

function designSystemFiles(): readonly string[] {
  return filesUnder(STYLES, ['.css']).filter((path) => path !== LEGACY);
}

function importedFiles(): readonly string[] {
  return designSystemFiles().filter((path) => path !== 'index.css');
}

function orderStatement(css: string): string | null {
  return /@layer\s+[\w\s,-]+;/u.exec(css)?.[0].replaceAll(/\s+/gu, ' ') ?? null;
}

function unique(names: readonly string[]): readonly string[] {
  return Array.from(new Set(names));
}

function definitions(css: string): readonly string[] {
  return unique(Array.from(css.matchAll(/(--[\w-]+)\s*:/gu), (found) => group(found, 1)));
}

function references(css: string, prefix: string): readonly string[] {
  const pattern = new RegExp(`var\\((${prefix}[\\w-]*)`, 'gu');
  return unique(Array.from(css.matchAll(pattern), (found) => group(found, 1)));
}

function definedAcross(folder: string): ReadonlySet<string> {
  const names = importedFiles()
    .filter((path) => path.startsWith(`${folder}/`))
    .flatMap((path) => definitions(style(path)));
  return new Set(names);
}

type Rule = { readonly selectors: readonly string[]; readonly body: string };

function rules(css: string): readonly Rule[] {
  return Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/gu), (found) => ({
    selectors: group(found, 1)
      .split(',')
      .map((part) => part.trim()),
    body: group(found, 2),
  }));
}

function ruleFor(css: string, selector: string): Rule {
  const found = rules(css).find((rule) => rule.selectors.includes(selector));
  if (found === undefined) throw new Error(`no rule for ${selector}`);
  return found;
}

function ruleBody(css: string, selector: string): string {
  return ruleFor(css, selector).body;
}

function styled(folders: readonly string[]): readonly string[] {
  return importedFiles().filter((path) => folders.includes(path.split('/')[0] ?? ''));
}

function withoutRuntimeInputs(css: string): string {
  return RUNTIME_INPUTS.reduce(
    (text, name) => text.replaceAll(new RegExp(`var\\(${name},`, 'gu'), 'var(,'),
    css,
  );
}

function keyframesIn(css: string): readonly string[] {
  return Array.from(css.matchAll(/@keyframes\s+([\w-]+)/gu), (found) => group(found, 1));
}

function animationNames(css: string): readonly string[] {
  return Array.from(css.matchAll(/animation(?:-name)?\s*:([^;}]*)/gu), (found) =>
    group(found, 1)
      .replaceAll(/var\([^()]*(?:\([^()]*\)[^()]*)*\)/gu, ' ')
      .split(/[\s,]+/u)
      .filter((word) => /^[a-z][\w-]*$/iu.test(word))
      .filter((word) => !ANIMATION_KEYWORDS.has(word)),
  ).flat();
}

function definesClass(css: string, name: string): boolean {
  return new RegExp(`\\.${name}(?![\\w-])[^{}]*\\{`, 'u').test(css);
}

function expectedLayer(path: string): string {
  const first = path.split('/')[0] ?? '';
  return first.endsWith('.css') ? first.slice(0, -'.css'.length) : first;
}

describe('the design system stylesheets', () => {
  it('declares the same layer order in app.html and in index.css', () => {
    const html = read(new URL('app.html', SOURCE));
    const inline = /<style>([\s\S]*?)<\/style>/u.exec(html)?.[1] ?? '';

    expect(orderStatement(inline)).toBe(
      '@layer open-props, reset, base, tokens, components, features, utilities, overrides;',
    );
    expect(inline.trim().replaceAll(/\s+/gu, ' ')).toBe(orderStatement(inline));
    expect(orderStatement(style('index.css'))).toBe(orderStatement(inline));
  });

  it('holds no @layer block in any file, and only the order statement in index.css', () => {
    for (const path of designSystemFiles()) {
      const statements = Array.from(
        style(path).matchAll(/@layer[^;{]*[;{]/gu),
        (found) => found[0],
      );
      const expected = path === 'index.css' ? 1 : 0;

      expect({ path, count: statements.length }).toEqual({ path, count: expected });
      for (const statement of statements) expect(statement.endsWith(';')).toBe(true);
    }
  });

  it('imports every file once, into the layer its folder names', () => {
    const imports = Array.from(
      style('index.css').matchAll(/@import\s+'([^']+)'\s+layer\(([\w-]+)\);/gu),
      (found) => ({ path: group(found, 1), layer: group(found, 2) }),
    );

    expect(imports.map((entry) => entry.path).toSorted()).toEqual(importedFiles());
    for (const entry of imports) expect(entry.layer).toBe(expectedLayer(entry.path));
  });

  it('imports the layers in the order the statement declares them', () => {
    const order = (orderStatement(style('index.css')) ?? '')
      .replace(/^@layer /u, '')
      .replace(/;$/u, '')
      .split(', ');
    const positions = Array.from(
      style('index.css').matchAll(/@import\s+'[^']+'\s+layer\(([\w-]+)\);/gu),
      (found) => order.indexOf(group(found, 1)),
    );

    expect(positions).not.toContain(-1);
    expect(positions).toEqual(positions.toSorted((left, right) => left - right));
  });

  it('keeps every --ds- name inside base and tokens', () => {
    const offenders = filesUnder(SOURCE, ['.css', '.svelte', '.html'])
      .filter((path) => !/^lib\/styles\/(base|tokens)\//u.test(path))
      .filter((path) => read(new URL(path, SOURCE)).includes('--ds-'));

    expect(offenders).toEqual([]);
  });

  it('has both themes assign exactly the same custom properties', () => {
    const theme = style('base/theme.css');
    const base = definitions(ruleBody(theme, ":root[data-theme='base']")).toSorted();
    const ember = definitions(ruleBody(theme, ":root[data-theme='ember']")).toSorted();

    expect(base.length).toBeGreaterThan(0);
    expect(ember).toEqual(base);
  });

  it('lets a bare root render the default theme', () => {
    const theme = style('base/theme.css');

    expect(ruleFor(theme, ":root[data-theme='base']").selectors).toContain(':root');
  });

  it('declares every scheme-dependent color once, with no media query or scheme palette', () => {
    const theme = style('base/theme.css');

    expect(theme).not.toMatch(/prefers-color-scheme/u);
    expect(ruleBody(theme, ":root[data-color-scheme='light']").trim()).toBe('color-scheme: light;');
    expect(ruleBody(theme, ":root[data-color-scheme='dark']").trim()).toBe('color-scheme: dark;');
  });

  it('defines every contract semantic token in tokens', () => {
    const defined = definedAcross('tokens');
    const missing = CONTRACT_TOKENS.filter((name) => !defined.has(name));

    expect(missing).toEqual([]);
  });

  it('maps every semantic token straight to a primitive', () => {
    for (const path of importedFiles().filter((file) => file.startsWith('tokens/'))) {
      const semantic = references(style(path), '--').filter((name) => !name.startsWith('--ds-'));

      expect({ path, semantic }).toEqual({ path, semantic: [] });
    }
  });

  it('resolves every primitive that base and tokens reference', () => {
    const defined = definedAcross('base');
    const referenced = importedFiles()
      .filter((path) => path.startsWith('base/') || path.startsWith('tokens/'))
      .flatMap((path) => references(style(path), '--ds-'));
    const unresolved = referenced.filter((name) => !defined.has(name));

    expect(unresolved).toEqual([]);
  });

  it('styles elements with semantic tokens that exist and never a primitive', () => {
    const elements = style('base/elements.css');
    const defined = definedAcross('tokens');
    const unresolved = references(elements, '--').filter((name) => !defined.has(name));

    expect(elements).not.toMatch(/--ds-/u);
    expect(unresolved).toEqual([]);
  });

  it('resolves every custom property a component, utility or override reads', () => {
    const tokens = definedAcross('tokens');

    for (const path of styled(['components', 'utilities', 'overrides'])) {
      const css = style(path);
      const local = new Set(definitions(css).filter((name) => name.startsWith('--_')));
      const unresolved = references(withoutRuntimeInputs(css), '--').filter(
        (name) => !tokens.has(name) && !local.has(name),
      );

      expect({ path, unresolved }).toEqual({ path, unresolved: [] });
    }
  });

  it('reads every runtime input with a fallback', () => {
    const css = styled(['components', 'utilities', 'overrides'])
      .map((path) => style(path))
      .join('\n');

    for (const name of RUNTIME_INPUTS) {
      const reads = css.split(`var(${name}`).length - 1;
      const withFallback = css.split(`var(${name},`).length - 1;

      expect({ name, reads }).not.toEqual({ name, reads: 0 });
      expect({ name, withFallback }).toEqual({ name, withFallback: reads });
    }
  });

  it('declares every @keyframes in utilities/animation.css', () => {
    const elsewhere = designSystemFiles()
      .filter((path) => path !== 'utilities/animation.css')
      .filter((path) => keyframesIn(style(path)).length > 0);

    expect(elsewhere).toEqual([]);
    expect(keyframesIn(style('utilities/animation.css')).length).toBeGreaterThan(0);
  });

  it('animates only with keyframes that exist', () => {
    const declared = new Set(keyframesIn(style('utilities/animation.css')));

    for (const path of styled(['components', 'utilities', 'overrides'])) {
      const missing = animationNames(style(path)).filter((name) => !declared.has(name));

      expect({ path, missing }).toEqual({ path, missing: [] });
    }
  });

  it('defines every contract component class and its parts in components', () => {
    const css = styled(['components'])
      .map((path) => style(path))
      .join('\n');
    const missing = Object.entries(CONTRACT_CLASSES)
      .flatMap(([base, parts]) => [base].concat(parts))
      .filter((name) => !definesClass(css, name));

    expect(missing).toEqual([]);
  });

  it('holds the z-index scale the contract locks', () => {
    const primitives = style('base/primitives.css');

    for (const [name, value] of Object.entries(LOCKED_Z_SCALE)) {
      expect(new RegExp(`${name}:\\s*${value};`, 'u').test(primitives)).toBe(true);
    }
  });
});
