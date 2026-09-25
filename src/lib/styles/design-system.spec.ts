import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TAG_COLOURS } from '../components/classes';

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

const SPACING_STEPS = ['0', '1', '2', '3', '4', '5', '6', '8'];

const SPACING_SIDES: Readonly<Record<string, string>> = {
  '': '',
  x: '-inline',
  y: '-block',
  s: '-inline-start',
  e: '-inline-end',
  t: '-block-start',
  b: '-block-end',
};

const SPACING_PROPERTIES: Readonly<Record<string, string>> = { p: 'padding', m: 'margin' };

const SURFACES: Readonly<Record<string, string>> = {
  'surface-bg': '--color-bg',
  surface: '--color-surface',
  'surface-raised': '--color-surface-raised',
  'surface-sunken': '--color-surface-sunken',
  'surface-bright': '--color-surface-bright',
};

const TOKEN_UTILITIES: Readonly<Record<string, readonly [string, string, string]>> = {
  'utilities/shadow.css': ['shadow', 'box-shadow', 'shadow'],
  'utilities/surface.css': ['rounded', 'border-radius', 'radius'],
  'utilities/media.css': ['aspect', 'aspect-ratio', 'ratio'],
};

const BORDER_SIDES: Readonly<Record<string, string>> = {
  t: 'border-block-start',
  b: 'border-block-end',
  s: 'border-inline-start',
  e: 'border-inline-end',
};

const SCHEMES = ['light', 'dark'];

const LANGUAGE_FACES = ['ja', 'ko'];

const WIDTH_STEPS = ['6', '8', '10'];

const GRID_MIN_COLUMNS = ['sm', 'lg'];

const GRIDS_WITHOUT_COLUMNS: Readonly<Record<string, string>> = {
  '.file-item-icon': 'a fixed-size box that centres one pseudo-element glyph',
  '.dropzone-icon': 'a fixed-size box that centres one pseudo-element glyph',
  '.checkbox-input': 'a fixed-size input that centres its pseudo-element check mark',
  '.radio-input': 'a fixed-size input that centres its pseudo-element dot',
  '.modal-backdrop[open]': 'centres one dialog whose inline size is contained',
  '.modal-backdrop.is-open': 'centres one dialog whose inline size is contained',
};

const RUNTIME_INPUTS = [
  '--menu-anchor-width',
  '--menu-bottom',
  '--menu-left',
  '--menu-right',
  '--menu-top',
  '--progress',
  '--skeleton-width',
  '--toast-timeout',
];

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

function themeFiles(): readonly string[] {
  return importedFiles().filter((path) => path.startsWith('base/themes/'));
}

function themeSheets(): string {
  return ['base/scheme.css']
    .concat(themeFiles())
    .map((path) => style(path))
    .join('\n');
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

function themeRules(css: string): readonly Rule[] {
  return rules(css).filter((rule) =>
    rule.selectors.some((selector) => /^:root\[data-theme=(['"])[\w-]+\1\]$/u.test(selector)),
  );
}

function ruleBody(css: string, selector: string): string {
  return ruleFor(css, selector).body;
}

function everyDeclarationFor(css: string, selector: string): readonly string[] {
  return rules(css)
    .filter((rule) => rule.selectors.includes(selector))
    .flatMap((rule) => declarations(rule.body));
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

function mediaBlock(css: string, query: string): string {
  const start = css.indexOf(`@media ${query}`);
  if (start === -1) return '';
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    if (css[index] === '}') depth -= 1;
    if (depth === 0) return css.slice(start, index + 1);
  }
  return css.slice(start);
}

function definitionValues(css: string): ReadonlyMap<string, string> {
  return new Map(
    Array.from(css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/gu), (found) => [
      group(found, 1),
      group(found, 2).trim().replaceAll(/\s+/gu, ' '),
    ]),
  );
}

function declarations(body: string): readonly string[] {
  return body
    .split(';')
    .map((part) => part.trim().replaceAll(/\s+/gu, ' '))
    .filter((part) => part !== '');
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

  it('has every theme assign exactly the custom properties the default theme assigns', () => {
    const themed = themeRules(themeSheets());
    const [defaults, ...others] = themed.filter((rule) => rule.selectors.includes(':root'));
    const expected = definitions(defaults?.body ?? '').toSorted();
    const assigned = themed.map((rule) => ({
      theme: rule.selectors.filter((selector) => selector !== ':root').join(', '),
      names: definitions(rule.body).toSorted(),
    }));

    expect(others).toEqual([]);
    expect(expected.length).toBeGreaterThan(0);
    expect(themed.length).toBeGreaterThan(1);
    expect(assigned).toEqual(assigned.map(({ theme }) => ({ theme, names: expected })));
  });

  it('declares one theme in each theme file, named after the file', () => {
    const declared = themeFiles().map((path) => ({
      path,
      themes: themeRules(style(path)).flatMap((rule) =>
        rule.selectors.flatMap((selector) =>
          Array.from(selector.matchAll(/\[data-theme='([\w-]+)'\]/gu), (found) => group(found, 1)),
        ),
      ),
    }));

    expect(declared.length).toBeGreaterThan(1);
    expect(declared).toEqual(
      declared.map(({ path }) => ({
        path,
        themes: [path.slice('base/themes/'.length, -'.css'.length)],
      })),
    );
  });

  it('declares each palette name in the palette of one theme file only', () => {
    const owners = themeFiles().flatMap((path) =>
      rules(style(path))
        .filter((rule) => rule.selectors.length === 1 && rule.selectors[0] === ':root')
        .flatMap((rule) => definitions(rule.body).map((name) => ({ name, path }))),
    );
    const shared = unique(owners.map(({ name }) => name))
      .map((name) => ({
        name,
        paths: unique(owners.filter((owner) => owner.name === name).map(({ path }) => path)),
      }))
      .filter(({ paths }) => paths.length > 1);

    expect(owners.length).toBeGreaterThan(0);
    expect(shared).toEqual([]);
  });

  it('lets a bare root render the default theme', () => {
    expect(ruleFor(themeSheets(), ":root[data-theme='base']").selectors).toContain(':root');
  });

  it('declares every scheme-dependent color once, with no media query or scheme palette', () => {
    const scheme = style('base/scheme.css');

    expect(themeSheets()).not.toMatch(/prefers-color-scheme/u);
    expect(ruleBody(scheme, ":root[data-color-scheme='light']").trim()).toBe(
      'color-scheme: light;',
    );
    expect(ruleBody(scheme, ":root[data-color-scheme='dark']").trim()).toBe('color-scheme: dark;');
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

  it('shrinks the toast timer toward the inline start in both directions', () => {
    const toast = style('components/toast.css');

    expect(ruleBody(toast, '.toast::after')).toMatch(/transform-origin:\s*left;/u);
    expect(ruleBody(toast, '.toast:dir(rtl)::after')).toMatch(/transform-origin:\s*right;/u);
  });

  it('gives every padding and margin utility the logical side and step its name says', () => {
    const spacing = style('utilities/spacing.css');

    for (const [kind, property] of Object.entries(SPACING_PROPERTIES)) {
      for (const [side, suffix] of Object.entries(SPACING_SIDES)) {
        for (const step of SPACING_STEPS) {
          const selector = `.${kind}${side}-${step}`;
          const value = step === '0' ? '0' : `var(--sp-${step})`;

          expect({ selector, body: declarations(ruleBody(spacing, selector)) }).toEqual({
            selector,
            body: [`${property}${suffix}: ${value}`],
          });
        }
      }
    }
  });

  it('paints every surface utility with its background and the text colour on it', () => {
    const surface = style('utilities/surface.css');

    for (const [name, token] of Object.entries(SURFACES)) {
      const selector = `.${name}`;

      expect({ selector, body: declarations(ruleBody(surface, selector)).toSorted() }).toEqual({
        selector,
        body: [`background-color: var(${token})`, 'color: var(--color-text)'],
      });
    }
  });

  it('clears the user agent box of a fieldset and the padding of its legend', () => {
    const fieldset = style('components/forms/fieldset.css');

    expect(declarations(ruleBody(fieldset, '.fieldset'))).toEqual(
      expect.arrayContaining(['min-inline-size: 0', 'margin: 0', 'padding: 0', 'border: none']),
    );
    expect(declarations(ruleBody(fieldset, '.fieldset-legend'))).toContain('padding: 0');
  });

  it('sets a fieldset legend in the type and colour of a field label', () => {
    const legend = declarations(
      ruleBody(style('components/forms/fieldset.css'), '.fieldset-legend'),
    );
    const label = declarations(ruleBody(style('components/forms/field.css'), '.field-label'));

    expect(legend.filter((part) => !/^(margin|padding)/u.test(part))).toEqual(label);
  });

  it('reads the token each shadow, radius and aspect utility names', () => {
    for (const [path, [prefix, property, tokenPrefix]] of Object.entries(TOKEN_UTILITIES)) {
      const found = rules(style(path)).filter((rule) =>
        rule.selectors.some((selector) => selector.startsWith(`.${prefix}-`)),
      );

      expect(found.length).toBeGreaterThan(0);
      for (const rule of found) {
        const [selector = ''] = rule.selectors;
        const suffix = selector.slice(`.${prefix}-`.length);

        expect({ selector, body: declarations(rule.body) }).toEqual({
          selector,
          body: [`${property}: var(--${tokenPrefix}-${suffix})`],
        });
      }
    }
  });

  it('gives each language face a :lang() rule that sets it on the element and its controls', () => {
    const elements = style('base/elements.css');

    for (const language of LANGUAGE_FACES) {
      const face = `var(--font-${language})`;

      expect({
        language,
        body: declarations(ruleBody(elements, `:where([lang]:lang(${language}))`)).toSorted(),
      }).toEqual({
        language,
        body: [`--font-body: ${face}`, `--font-display: ${face}`, `font-family: ${face}`],
      });
    }
  });

  it('points each grid density modifier at the minimum column token its name says', () => {
    const grid = style('utilities/grid.css');

    for (const size of GRID_MIN_COLUMNS) {
      const selector = `.grid-auto-${size}`;

      expect({ selector, body: declarations(ruleBody(grid, selector)) }).toEqual({
        selector,
        body: [`--grid-min-col: var(--grid-min-col-${size})`],
      });
    }
  });

  it('sizes the auto grids and the scroll strip from the minimum column the modifiers set', () => {
    const grid = style('utilities/grid.css');
    const strip = ruleBody(style('utilities/layout-patterns.css'), '.scroll-strip');

    expect(ruleBody(grid, '.grid-auto')).toContain('var(--grid-min-col)');
    expect(ruleBody(grid, '.grid-auto-fit')).toContain('var(--grid-min-col)');
    expect(strip).toContain('var(--grid-min-col)');
    expect(declarations(strip)).toEqual(
      expect.arrayContaining(['grid-auto-flow: column', 'scroll-snap-type: inline mandatory']),
    );
  });

  it('gives the main area one track that shrinks below the min-content of its children', () => {
    expect(declarations(ruleBody(style('utilities/layout.css'), '.layout-main-area'))).toContain(
      'grid-template-columns: minmax(0, 1fr)',
    );
  });

  it('declares the columns of every component and utility grid, so no content-sized track can widen it', () => {
    const untracked = styled(['components', 'utilities']).flatMap((path) => {
      const all = rules(style(path));
      const tracked = (selector: string): boolean =>
        all.some(
          (rule) =>
            rule.selectors.includes(selector) &&
            declarations(rule.body).some((declaration) =>
              /^grid-(?:template(?:-columns)?|auto-columns):/u.test(declaration),
            ),
        );
      return all
        .filter((rule) => declarations(rule.body).includes('display: grid'))
        .flatMap((rule) => rule.selectors)
        .filter((selector) => !tracked(selector));
    });
    expect(untracked.toSorted()).toEqual(Object.keys(GRIDS_WITHOUT_COLUMNS).toSorted());
  });

  it('keeps the width of the scroll strip content out of the width of its container', () => {
    expect(
      declarations(ruleBody(style('utilities/layout-patterns.css'), '.scroll-strip')),
    ).toContain('contain: inline-size');
  });

  it('wraps a fill item onto its own line before it shrinks below a grid column', () => {
    expect(declarations(ruleBody(style('utilities/flex.css'), '.flex-fill'))).toEqual([
      'flex: 1 1 var(--grid-min-col)',
      'min-inline-size: 0',
    ]);
  });

  it('hides a hover reveal only on a device that can hover', () => {
    const patterns = style('utilities/layout-patterns.css');
    const hover = mediaBlock(patterns, '(hover: hover)');

    expect(definesClass(hover, 'reveal-on-hover')).toBe(true);
    expect(definesClass(patterns.replace(hover, ''), 'reveal-on-hover')).toBe(false);
    expect(declarations(ruleBody(hover, '.reveal-on-hover'))).toContain('opacity: 0');
  });

  it('lets pointer events through a pass-through layer but not through its controls', () => {
    const patterns = style('utilities/layout-patterns.css');
    const controls = rules(patterns).find((rule) =>
      rule.selectors.some((selector) => selector.startsWith('.overlay-pass-through :is(')),
    );

    expect(declarations(ruleBody(patterns, '.overlay-pass-through'))).toEqual([
      'pointer-events: none',
    ]);
    expect(declarations(controls?.body ?? '')).toEqual(['pointer-events: auto']);
  });

  it('dims a busy element by the muted opacity token', () => {
    expect(declarations(ruleBody(style('utilities/state.css'), '.is-busy'))).toContain(
      'opacity: var(--opacity-muted)',
    );
  });

  it('stacks the tab header above the panel in a flex column, so a wide tab row cannot widen the panel', () => {
    const tabs = declarations(ruleBody(style('components/tabs.css'), '.tabs'));

    expect(tabs).toEqual(expect.arrayContaining(['display: flex', 'flex-direction: column']));
    expect(tabs).not.toContain('display: grid');
  });

  it('keeps the scrollbar gutter while a modal covers a page that showed a scrollbar', () => {
    const overrides = style('overrides/overrides.css');

    expect(declarations(ruleBody(overrides, 'html:has(.modal-backdrop[open])'))).toContain(
      'overflow: hidden',
    );
    expect(
      declarations(ruleBody(overrides, 'html:has(.modal-backdrop[open][data-page-scrollbar])')),
    ).toContain('scrollbar-gutter: stable');
  });

  it('declares every tag colour in the shared scheme as light-dark pairs, and in no theme', () => {
    const scheme = definitionValues(style('base/scheme.css'));
    const themed = themeFiles().flatMap((path) => definitions(style(path)));

    for (const colour of TAG_COLOURS) {
      for (const name of [
        `--ds-tag-${colour}`,
        `--ds-tag-${colour}-ink`,
        `--ds-tag-${colour}-wash`,
      ]) {
        expect({ name, value: scheme.get(name)?.startsWith('light-dark(') }).toEqual({
          name,
          value: true,
        });
      }
    }
    expect(themed.filter((name) => name.startsWith('--ds-tag-'))).toEqual([]);
  });

  it('maps every tag colour to its text, background and border tokens', () => {
    const tokens = definitionValues(style('tokens/colors.css'));

    for (const colour of TAG_COLOURS) {
      expect({
        colour,
        border: tokens.get(`--color-tag-${colour}`),
        text: tokens.get(`--color-tag-${colour}-text`),
        background: tokens.get(`--color-tag-${colour}-bg`),
      }).toEqual({
        colour,
        border: `var(--ds-tag-${colour})`,
        text: `var(--ds-tag-${colour}-ink)`,
        background: `var(--ds-tag-${colour}-wash)`,
      });
    }
  });

  it('gives every tag colour a tag and a badge class that read only that colour and the inverse text', () => {
    const tag = style('components/tag.css');
    const badge = style('components/badge.css');

    for (const colour of TAG_COLOURS) {
      expect({ colour, body: declarations(ruleBody(tag, `.tag-color-${colour}`)) }).toEqual({
        colour,
        body: [
          `--_tag-text: var(--color-tag-${colour}-text)`,
          `--_tag-bg: var(--color-tag-${colour}-bg)`,
          `--_tag-border: var(--color-tag-${colour})`,
          '--_tag-on: var(--color-text-inverse)',
        ],
      });
      expect({ colour, body: declarations(ruleBody(badge, `.badge-color-${colour}`)) }).toEqual({
        colour,
        body: [
          `--_badge-fg: var(--color-tag-${colour}-text)`,
          `--_badge-bg: var(--color-tag-${colour}-bg)`,
          `--_badge-border: var(--color-tag-${colour})`,
        ],
      });
    }
  });

  it('highlights a mark with the soft primary fill and keeps the text colour around it', () => {
    expect(declarations(ruleBody(style('base/elements.css'), 'mark'))).toEqual([
      'color: inherit',
      'background-color: var(--color-primary-soft)',
      'border-radius: var(--radius-xs)',
    ]);
  });

  it('sizes each width utility to the spacing step its name says', () => {
    const layout = style('utilities/layout.css');

    for (const step of WIDTH_STEPS) {
      const selector = `.w-${step}`;

      expect({ selector, body: declarations(ruleBody(layout, selector)) }).toEqual({
        selector,
        body: [`inline-size: var(--sp-${step})`],
      });
    }
  });

  it('keeps a shrink-0 item at its own size in a flex row', () => {
    expect(declarations(ruleBody(style('utilities/flex.css'), '.shrink-0'))).toEqual([
      'flex-shrink: 0',
    ]);
  });

  it('clears the bullets and the indent of a reset list', () => {
    expect(declarations(ruleBody(style('utilities/layout.css'), '.list-reset')).toSorted()).toEqual(
      ['list-style: none', 'padding: 0'],
    );
  });

  it('draws the start accent on the inline-start side in the accent colour', () => {
    expect(declarations(ruleBody(style('utilities/surface.css'), '.accent-start'))).toEqual([
      'padding-inline-start: var(--sp-2)',
      'border-inline-start: var(--border-width-strong) solid var(--color-accent-mid)',
    ]);
  });

  it('anchors a top-placed modal to the top and keeps it inside the viewport', () => {
    const top = declarations(ruleBody(style('components/modal/modal.css'), '.modal-top'));

    expect(top).toEqual(
      expect.arrayContaining([
        'align-self: start',
        'margin-block-start: var(--sp-10)',
        'max-block-size: calc(100dvh - var(--sp-10) - 2 * var(--sp-4))',
      ]),
    );
  });

  it('removes the padding of a flush modal body', () => {
    expect(
      declarations(ruleBody(style('components/modal/modal.css'), '.modal-body-flush')),
    ).toEqual(['padding: 0']);
  });

  it('keeps an information footer in a row when a narrow modal stacks its action footer', () => {
    const modal = style('components/modal/modal.css');
    const reversing = rules(modal).filter((rule) =>
      declarations(rule.body).includes('flex-direction: column-reverse'),
    );

    expect(reversing.flatMap((rule) => rule.selectors)).toEqual([
      '.modal-footer:not(.modal-footer-info)',
    ]);
    expect(declarations(ruleBody(modal, '.modal-footer-info'))).toEqual(
      expect.arrayContaining(['flex-wrap: wrap', 'justify-content: space-between']),
    );
  });

  it('styles a command item on its own, outside any dropdown', () => {
    const command = style('components/command.css');
    const selectors = rules(command).flatMap((rule) => rule.selectors);

    expect(selectors.filter((selector) => !selector.startsWith('.command-item'))).toEqual([]);
    expect(declarations(ruleBody(command, '.command-item'))).toContain('display: flex');
    expect(declarations(ruleBody(command, '.command-item.is-selected'))).toContain(
      'background-color: var(--color-selected)',
    );
    expect(declarations(ruleBody(command, '.command-item-hint'))).toContain(
      'margin-inline-start: auto',
    );
  });

  it('draws each one-sided border on the logical side its name says, as a bordered box draws all four', () => {
    const surface = style('utilities/surface.css');
    const all = declarations(ruleBody(surface, '.bordered'))[0]?.replace(/^border:/u, '');

    for (const [side, property] of Object.entries(BORDER_SIDES)) {
      const selector = `.border-${side}`;

      expect({ selector, body: declarations(ruleBody(surface, selector)) }).toEqual({
        selector,
        body: [`${property}:${all}`],
      });
    }
  });

  it('pins a subtree to the scheme its name says and sets its text colour in that scheme', () => {
    const surface = style('utilities/surface.css');

    for (const scheme of SCHEMES) {
      const selector = `.scheme-${scheme}`;

      expect({ selector, body: declarations(ruleBody(surface, selector)).toSorted() }).toEqual({
        selector,
        body: ['color-scheme: ' + scheme, 'color: var(--color-text)'],
      });
    }
  });

  it('hides a hushed element from sight and from the pointer, but not from layout', () => {
    const state = style('utilities/state.css');

    expect(declarations(ruleBody(state, '.is-hushed'))).toEqual([
      'opacity: 0',
      'pointer-events: none',
    ]);
  });

  it('fades a hushable element and eases its block margins on the motion tokens', () => {
    expect(declarations(ruleBody(style('utilities/state.css'), '.hushable'))).toEqual([
      'transition: opacity var(--dur-quick) var(--ease-smooth), margin-block var(--dur-quick) var(--ease-smooth)',
    ]);
  });

  it('pins a bar across the full width of its positioned ancestor, at the edge its name says', () => {
    const layout = style('utilities/layout.css');

    expect(everyDeclarationFor(layout, '.pin-top').toSorted()).toEqual([
      'inset-block-start: 0',
      'inset-inline: 0',
      'position: absolute',
    ]);
    expect(everyDeclarationFor(layout, '.pin-bottom').toSorted()).toEqual([
      'inset-block-end: 0',
      'inset-inline: 0',
      'position: absolute',
    ]);
    expect(declarations(ruleBody(layout, '.relative'))).toEqual(['position: relative']);
  });

  it('gives every step of the z-index scale a utility that reads its token', () => {
    const layout = style('utilities/layout.css');

    for (const primitive of Object.keys(LOCKED_Z_SCALE)) {
      const name = primitive.replace('--ds-', '');

      expect({ name, body: declarations(ruleBody(layout, `.${name}`)) }).toEqual({
        name,
        body: [`z-index: var(--${name})`],
      });
    }
  });

  it('pads a responsive box by the narrow step below the compact breakpoint of its container, and the wide step above it', () => {
    const body = declarations(ruleBody(style('utilities/spacing.css'), '.px-responsive'));

    expect(body).toEqual([
      'padding-inline: clamp(var(--sp-4), (100% - var(--breakpoint-compact)) * 1000, var(--sp-6))',
    ]);
    expect(definitionValues(style('tokens/spacing.css')).get('--breakpoint-compact')).toBe(
      'var(--ds-size-compact)',
    );
    expect(definitionValues(style('base/primitives.css')).get('--ds-size-compact')).toBe(
      '43.75rem',
    );
  });

  it('holds the z-index scale the contract locks', () => {
    const primitives = style('base/primitives.css');

    for (const [name, value] of Object.entries(LOCKED_Z_SCALE)) {
      expect(new RegExp(`${name}:\\s*${value};`, 'u').test(primitives)).toBe(true);
    }
  });
});
