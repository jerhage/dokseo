import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { NARROW_SCREEN_QUERY } from '../components/breakpoints';
import { TAG_COLOURS } from '../components/classes';

const STYLES = new URL('./', import.meta.url);
const SOURCE = new URL('../../../', import.meta.url);

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
    'badge-primary',
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

const TEXT_COLOURS: Readonly<Record<string, string>> = {
  'text-muted': '--color-text-muted',
  'text-faint': '--color-text-faint',
  'text-primary': '--color-primary',
  'text-accent': '--color-accent',
  'text-success': '--color-success',
  'text-warning': '--color-warning',
  'text-danger': '--color-danger',
  'text-info': '--color-info',
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

const WIDTH_STEPS = ['sm', 'md', 'lg'] as const;

const GRID_MIN_COLUMNS = ['sm', 'lg'];

const GRIDS_WITHOUT_COLUMNS: Readonly<Record<string, string>> = {
  '.file-item-icon-frame': 'a fixed-size box that centres one icon',
  '.dropzone-icon-frame': 'a fixed-size box that centres one icon',
  '.window-dropzone-icon-frame': 'a fixed-size box that centres one icon',
  '.radio-input': 'a fixed-size input that centres its pseudo-element dot',
  '.modal-backdrop[open]': 'centres one dialog whose inline size is contained',
};

const BREAKPOINT_SCALE = ['24rem', '26rem', '34rem', '40rem', '44rem'];

const NARROW_QUERIES: Readonly<Record<string, number>> = {
  'lib/ui/styles/components/modal/modal.css': 2,
  'lib/ui/styles/components/toast.css': 1,
  'lib/ui/styles/utilities/layout.css': 4,
};

const RUNTIME_INPUTS = [
  '--breakpoint-probe-width',
  '--btn-min-block-size',
  '--carousel-beside',
  '--carousel-shift',
  '--chrome-bar-lift',
  '--diagram-width',
  '--dock-probe-height',
  '--dock-sheet-height',
  '--indent-depth',
  '--menu-anchor-width',
  '--menu-left',
  '--menu-max-width',
  '--menu-top',
  '--nav-link-direction',
  '--nav-link-gap',
  '--nav-link-justify',
  '--nav-link-padding-inline',
  '--nav-link-text-align',
  '--pin-drop',
  '--pin-lift',
  '--popover-left',
  '--popover-top',
  '--progress',
  '--rect-height',
  '--rect-left',
  '--rect-top',
  '--rect-width',
  '--skeleton-width',
  '--slider-tick-at',
  '--tabs-header-wrap',
  '--toast-offset-block-end',
  '--toast-timeout',
  '--zoom-surface-pan-x',
  '--zoom-surface-pan-y',
  '--zoom-surface-zoom',
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

function lightDarkPair(value: string | undefined): readonly [string, string] | null {
  const inner = /^light-dark\((.*)\)$/u.exec(value ?? '')?.[1];
  if (inner === undefined) return null;

  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (const [index, character] of Array.from(inner).entries()) {
    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;
    if (character === ',' && depth === 0) {
      parts.push(inner.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(inner.slice(start).trim());

  const [light, dark, ...rest] = parts;
  if (light === undefined || dark === undefined || rest.length > 0) return null;
  return [light, dark];
}

function oklchLightness(colour: string): number | null {
  const found = /^oklch\(([\d.]+)\s/u.exec(colour);
  return found === null ? null : Number(group(found, 1));
}

function withoutComments(css: string): string {
  return css.replaceAll(/\/\*[\s\S]*?\*\//gu, '');
}

function filesUnder(root: URL, extensions: readonly string[]): readonly string[] {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(fileURLToPath(root), join(entry.parentPath, entry.name)))
    .filter((path) => extensions.some((extension) => path.endsWith(extension)))
    .map((path) => path.split('\\').join('/'))
    .toSorted();
}

function designSystemFiles(): readonly string[] {
  return filesUnder(STYLES, ['.css']);
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

function themeName(path: string): string {
  return path.slice('base/themes/'.length, -'.css'.length);
}

function paletteRule(path: string): Rule {
  const [palette] = rules(style(path));
  if (palette === undefined) throw new Error(`no palette in ${path}`);
  return palette;
}

function roleRule(path: string): Rule {
  const [, roles] = rules(style(path));
  if (roles === undefined) throw new Error(`no role primitives in ${path}`);
  return roles;
}

function roleBody(theme: string): string {
  return roleRule(`base/themes/${theme}.css`).body;
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

function queryWidths(css: string): readonly string[] {
  return Array.from(css.matchAll(/@(?:media|container)\b([^{]*)\{/gu), (found) =>
    Array.from(group(found, 1).matchAll(/\d+(?:\.\d+)?(?:rem|em|px)/gu), (width) => width[0]),
  ).flat();
}

function sourceStylesheets(): readonly string[] {
  return filesUnder(SOURCE, ['.css']);
}

function sourceStyle(path: string): string {
  return withoutComments(read(new URL(path, SOURCE)));
}

function mediaBlock(css: string, query: string): string {
  return atRuleBlock(css, `@media ${query}`);
}

function atRuleBlock(css: string, prelude: string): string {
  const start = css.indexOf(prelude);
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

  it('keeps every --ds- name inside base and tokens, apart from the docs that quote them', () => {
    const offenders = filesUnder(SOURCE, ['.css', '.svelte', '.html'])
      .filter((path) => !/^lib\/ui\/styles\/(base|tokens)\//u.test(path))
      .filter((path) => !path.startsWith('lib/domains/docs/'))
      .filter((path) => read(new URL(path, SOURCE)).includes('--ds-'));

    expect(offenders).toEqual([]);
  });

  it('holds a palette and then the role primitives in each theme file, each scoped to its theme', () => {
    const scoped = themeFiles().map((path) => ({
      path,
      selectors: rules(style(path)).map((rule) => rule.selectors),
    }));
    const expected = (path: string) =>
      themeName(path) === 'base'
        ? [[':root'], [':root', ":root[data-theme='base']"]]
        : [[`:root[data-theme='${themeName(path)}']`], [`:root[data-theme='${themeName(path)}']`]];

    expect(scoped.length).toBeGreaterThan(1);
    expect(scoped).toEqual(scoped.map(({ path }) => ({ path, selectors: expected(path) })));
  });

  it('has every theme assign exactly the role primitives the default theme assigns, an icon stroke among them', () => {
    const expected = definitions(roleBody('base')).toSorted();
    const assigned = themeFiles().map((path) => ({
      path,
      names: definitions(roleRule(path).body).toSorted(),
    }));

    expect(expected).toContain('--ds-icon-stroke');
    expect(assigned.length).toBeGreaterThan(1);
    expect(assigned).toEqual(assigned.map(({ path }) => ({ path, names: expected })));
  });

  it('declares one theme in each theme file, named after the file', () => {
    const declared = themeFiles().map((path) => ({
      path,
      themes: unique(
        themeRules(style(path)).flatMap((rule) =>
          rule.selectors.flatMap((selector) =>
            Array.from(selector.matchAll(/\[data-theme='([\w-]+)'\]/gu), (found) =>
              group(found, 1),
            ),
          ),
        ),
      ),
    }));

    expect(declared.length).toBeGreaterThan(1);
    expect(declared).toEqual(declared.map(({ path }) => ({ path, themes: [themeName(path)] })));
  });

  it('names no palette primitive after a theme', () => {
    const themes = new Set(themeFiles().map(themeName));
    const named = themeFiles()
      .flatMap((path) => definitions(paletteRule(path).body))
      .filter((name) =>
        name
          .slice('--ds-'.length)
          .split('-')
          .some((word) => themes.has(word)),
      );

    expect(named).toEqual([]);
  });

  it('gives no palette primitive the name of a shared primitive, a role primitive or a default palette primitive', () => {
    const shared = new Set(
      ['base/primitives.css', 'base/scheme.css'].flatMap((path) => definitions(style(path))),
    );
    const reserved = new Set([
      ...shared,
      ...definitions(roleBody('base')),
      ...definitions(paletteRule('base/themes/base.css').body),
    ]);
    const clashing = themeFiles()
      .filter((path) => themeName(path) !== 'base')
      .flatMap((path) => definitions(paletteRule(path).body).map((name) => ({ path, name })))
      .filter(({ name }) => reserved.has(name));
    const defaults = definitions(paletteRule('base/themes/base.css').body).filter(
      (name) => shared.has(name) || definitions(roleBody('base')).includes(name),
    );

    expect(clashing).toEqual([]);
    expect(defaults).toEqual([]);
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

  it('paints every surface utility with its background and the text colour on it, and the page surface with the page backdrop', () => {
    const surface = style('utilities/surface.css');

    for (const [name, token] of Object.entries(SURFACES)) {
      const selector = `.${name}`;
      const backdrop = name === 'surface-bg' ? ['background-image: var(--page-backdrop)'] : [];

      expect({ selector, body: declarations(ruleBody(surface, selector)).toSorted() }).toEqual({
        selector,
        body: [`background-color: var(${token})`, ...backdrop, 'color: var(--color-text)'],
      });
    }
  });

  it('colours the text of every text colour utility with the semantic token its name says, and nothing else', () => {
    const text = style('utilities/text.css');

    for (const [name, token] of Object.entries(TEXT_COLOURS)) {
      const selector = `.${name}`;

      expect({ selector, body: declarations(ruleBody(text, selector)) }).toEqual({
        selector,
        body: [`color: var(${token})`],
      });
    }
  });

  it('sets an eyebrow in the extra-small size, the wider tracking and upper case, and nothing else', () => {
    expect(declarations(ruleBody(style('utilities/text.css'), '.eyebrow'))).toEqual([
      'font-size: var(--text-xs)',
      'letter-spacing: var(--ls-wider)',
      'text-transform: uppercase',
    ]);
  });

  it('leaves the eyebrow recipe to the utility in the card eyebrow, the stat label, the dropdown label, the labelled divider and the table header cell', () => {
    const copies = [
      { file: 'components/card.css', selector: '.card-eyebrow' },
      { file: 'components/stat.css', selector: '.stat-label' },
      { file: 'components/dropdown.css', selector: '.dropdown-label' },
      { file: 'components/divider.css', selector: '.divider-labeled' },
      { file: 'components/table.css', selector: '.table th' },
    ].flatMap(({ file, selector }) =>
      declarations(ruleBody(style(file), selector)).filter((part) =>
        /^(font-size|letter-spacing|text-transform):/u.test(part),
      ),
    );

    expect(copies).toEqual([]);
  });

  it('sets code inside a table header cell in its own case and normal tracking, and nothing else', () => {
    expect(declarations(ruleBody(style('components/table.css'), '.table th code'))).toEqual([
      'letter-spacing: var(--ls-normal)',
      'text-transform: none',
    ]);
  });

  it('colours every component eyebrow faint', () => {
    const colours = [
      { file: 'components/card.css', selector: '.card-eyebrow' },
      { file: 'components/stat.css', selector: '.stat-label' },
      { file: 'components/dropdown.css', selector: '.dropdown-label' },
      { file: 'components/divider.css', selector: '.divider-labeled' },
      { file: 'components/list-group.css', selector: '.list-group-title' },
      { file: 'components/table.css', selector: '.table th' },
    ].map(({ file, selector }) => ({
      selector,
      colour: declarations(ruleBody(style(file), selector)).find((part) =>
        part.startsWith('color:'),
      ),
    }));

    expect(colours).toEqual([
      { selector: '.card-eyebrow', colour: 'color: var(--color-text-faint)' },
      { selector: '.stat-label', colour: 'color: var(--color-text-faint)' },
      { selector: '.dropdown-label', colour: 'color: var(--color-text-faint)' },
      { selector: '.divider-labeled', colour: 'color: var(--color-text-faint)' },
      { selector: '.list-group-title', colour: 'color: var(--color-text-faint)' },
      { selector: '.table th', colour: 'color: var(--color-text-faint)' },
    ]);
  });

  it('declares the eyebrow before every text utility, so a size, tracking, face, weight or colour utility beside it wins', () => {
    const textRules = rules(style('utilities/text.css'));
    const eyebrow = textRules.findIndex((rule) => rule.selectors.includes('.eyebrow'));
    const typeSetters = textRules
      .map((rule, index) => ({ rule, index }))
      .filter(({ rule }) =>
        declarations(rule.body).some((part) =>
          /^(font-size|letter-spacing|text-transform|font-family|font-weight|color):/u.test(part),
        ),
      )
      .filter(({ rule }) => !rule.selectors.includes('.eyebrow'));

    expect(typeSetters.length).toBeGreaterThan(0);
    for (const { rule, index } of typeSetters) {
      expect({ selectors: rule.selectors, after: index > eyebrow }).toEqual({
        selectors: rule.selectors,
        after: true,
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

  it('fills the viewport with the full-page shell and scrolls only its main area', () => {
    const layout = style('utilities/layout.css');

    expect(declarations(ruleBody(layout, '.layout-app-shell'))).toEqual(
      expect.arrayContaining([
        'block-size: 100dvh',
        'grid-template-rows: auto auto minmax(0, 1fr)',
      ]),
    );
    expect(
      declarations(
        ruleBody(layout, '.layout-app-shell:not(.layout-app-shell-embedded) > .layout-main-area'),
      ),
    ).toEqual(
      expect.arrayContaining([
        'position: relative',
        'min-block-size: 0',
        'overflow-y: auto',
        'scrollbar-gutter: stable',
      ]),
    );
  });

  it('shares one row between the links of a compact shell nav below the shell breakpoint, and hides their detail and the aside', () => {
    const layout = style('utilities/layout.css');
    const narrow = atRuleBlock(layout, '@container app-shell (max-width: 48rem)');

    expect(declarations(ruleBody(narrow, '.layout-app-shell-nav-compact > *'))).toEqual([
      'flex: 1 1 0',
      'min-inline-size: 0',
    ]);
    expect(declarations(ruleBody(narrow, '.layout-app-shell-nav-compact'))).toEqual(
      expect.arrayContaining(['flex-wrap: wrap', '--nav-link-direction: column']),
    );
    expect(declarations(ruleBody(narrow, '.layout-app-shell-nav-detail'))).toEqual([
      'display: none',
    ]);
    expect(declarations(ruleBody(narrow, '.layout-app-shell-nav-aside'))).toEqual([
      'display: none',
    ]);
    expect(
      rules(layout.replace(narrow, '')).some((rule) =>
        rule.selectors.includes('.layout-app-shell-nav-detail'),
      ),
    ).toBe(false);
  });

  it('hides wide-only shell content, keeps a nowrap row on one line, grows the buttons of a touch row to the 44px touch height, keeps a narrow row at its content width and hides content visually, all strictly below the shell breakpoint', () => {
    const layout = style('utilities/layout.css');
    const narrow = atRuleBlock(layout, '@container app-shell (width < 48rem)');
    const elsewhere = layout.replace(narrow, '');
    const narrowShell: readonly (readonly [string, readonly string[]])[] = [
      ['wide-only', ['display: none']],
      ['narrow-nowrap', ['flex-wrap: nowrap', '--tabs-header-wrap: nowrap']],
      ['narrow-touch', ['--btn-min-block-size: var(--control-h-touch)']],
      ['narrow-fit', ['flex: none']],
      [
        'narrow-visually-hidden',
        declarations(ruleBody(style('utilities/text.css'), '.visually-hidden')),
      ],
    ];

    for (const [name, declared] of narrowShell) {
      expect(
        declarations(ruleBody(narrow, `.layout-app-shell .layout-app-shell-${name}`)),
        name,
      ).toEqual(declared);
      expect(elsewhere, name).not.toMatch(new RegExp(`layout-app-shell-${name}(?![\\w-])`, 'u'));
    }
    expect(definitionValues(style('tokens/sizes.css')).get('--control-h-touch')).toBe(
      'var(--ds-size-touch)',
    );
    expect(definitionValues(style('base/primitives.css')).get('--ds-size-touch')).toBe('2.75rem');
  });

  it('hides narrow-only shell content from the shell breakpoint up', () => {
    const layout = style('utilities/layout.css');
    const wide = atRuleBlock(layout, '@container app-shell (width >= 48rem)');

    expect(declarations(ruleBody(wide, '.layout-app-shell .layout-app-shell-narrow-only'))).toEqual(
      ['display: none'],
    );
    expect(
      rules(layout.replace(wide, '')).some((rule) =>
        rule.selectors.some((selector) => selector.endsWith('.layout-app-shell-narrow-only')),
      ),
    ).toBe(false);
  });

  it('names no button tone and no button emphasis together in one selector', () => {
    const named = (selector: string, names: readonly string[]): boolean =>
      names.some((name) => new RegExp(`\\.${name}(?![\\w-])`, 'u').test(selector));
    const selectors = rules(style('components/btn.css')).flatMap((rule) => rule.selectors);

    expect(
      selectors.filter(
        (selector) =>
          named(selector, ['btn-primary', 'btn-accent', 'btn-danger']) &&
          named(selector, ['btn-outline', 'btn-ghost']),
      ),
    ).toEqual([]);
  });

  it('lets a touch shell row and a compact shell nav adjust buttons and links only through the custom properties those read', () => {
    const btn = style('components/btn.css');
    const link = style('components/nav/nav-link.css');

    expect(declarations(ruleBody(btn, '.btn'))).toContain(
      'min-block-size: var(--btn-min-block-size, var(--control-h-md))',
    );
    expect(declarations(ruleBody(btn, '.btn-sm'))).toContain(
      'min-block-size: var(--btn-min-block-size, var(--control-h-sm))',
    );
    expect(declarations(ruleBody(btn, '.btn-lg'))).toContain(
      'min-block-size: var(--btn-min-block-size, var(--control-h-lg))',
    );
    expect(declarations(ruleBody(link, '.nav-link'))).toEqual(
      expect.arrayContaining([
        'flex-direction: var(--nav-link-direction, row)',
        'justify-content: var(--nav-link-justify, normal)',
        'gap: var(--nav-link-gap, var(--sp-2))',
        'padding-inline: var(--nav-link-padding-inline, var(--sp-3))',
        'text-align: var(--nav-link-text-align, start)',
      ]),
    );
  });

  it('names no component class in any utility', () => {
    const classesIn = (css: string): readonly string[] =>
      rules(withoutComments(css)).flatMap((rule) =>
        rule.selectors.flatMap((selector) =>
          Array.from(selector.matchAll(/\.([a-z][\w-]*)/giu), (found) => group(found, 1)),
        ),
      );
    const components = new Set(styled(['components']).flatMap((path) => classesIn(style(path))));

    for (const path of styled(['utilities'])) {
      const named = unique(classesIn(style(path)).filter((name) => components.has(name)));

      expect({ path, named }).toEqual({ path, named: [] });
    }
  });

  it('lets an element shrink below its content width', () => {
    expect(declarations(ruleBody(style('utilities/layout.css'), '.min-w-0'))).toEqual([
      'min-inline-size: 0',
    ]);
  });

  it('wraps the tab header unless an ancestor sets it not to', () => {
    expect(declarations(ruleBody(style('components/tabs.css'), '.tabs-header'))).toContain(
      'flex-wrap: var(--tabs-header-wrap, wrap)',
    );
  });

  it('keeps the tab actions at their own width, so a row that cannot wrap shrinks the tab list instead', () => {
    expect(declarations(ruleBody(style('components/tabs.css'), '.tabs-actions'))).toContain(
      'flex-shrink: 0',
    );
  });

  it('pushes the shell nav aside to the end of the wide nav', () => {
    expect(
      declarations(ruleBody(style('utilities/layout.css'), '.layout-app-shell-nav-aside')),
    ).toEqual(['margin-block-start: auto']);
  });

  it('keeps the embedded shell at the height of its content', () => {
    expect(
      declarations(ruleBody(style('utilities/layout.css'), '.layout-app-shell-embedded')),
    ).toContain('block-size: auto');
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
      rule.selectors.some((selector) => selector.startsWith('.pass-through :is(')),
    );

    expect(declarations(ruleBody(patterns, '.pass-through'))).toEqual(['pointer-events: none']);
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

  it('hides the transient overlays and flattens the framed surfaces when the page is printed', () => {
    const print = mediaBlock(style('overrides/overrides.css'), 'print');
    const overlays = [
      '.toast-region',
      '.modal-backdrop',
      '.dropdown-menu',
      '.alert-close',
      '.tag-remove',
      '.file-item-remove',
    ];
    const surfaces = ['.card', '.alert', '.table-wrapper', '.modal'];

    for (const selector of overlays) {
      expect({ selector, printed: everyDeclarationFor(print, selector) }).toEqual({
        selector,
        printed: ['display: none'],
      });
    }
    for (const selector of surfaces) {
      expect({ selector, printed: everyDeclarationFor(print, selector) }).toEqual({
        selector,
        printed: ['box-shadow: none', 'break-inside: avoid'],
      });
    }
  });

  it('shows, animates and locks the page for a modal through the native [open] alone', () => {
    const sheets = [
      'components/modal/modal.css',
      'components/modal/modal-transitions.css',
      'overrides/overrides.css',
    ].map(style);

    const toggled = unique(
      sheets.flatMap((sheet) =>
        Array.from(sheet.matchAll(/\.modal-backdrop\.([\w-]+)/gu), (found) => group(found, 1)),
      ),
    );

    expect(toggled).toEqual(['is-leaving']);
    expect(
      declarations(ruleBody(style('components/modal/modal.css'), '.modal-backdrop[open]')),
    ).toContain('display: grid');
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
        const pair = lightDarkPair(scheme.get(name));
        const [light, dark] = pair ?? ['', ''];
        const lightInLight = oklchLightness(light);
        const lightInDark = oklchLightness(dark);

        expect({ name, paired: pair !== null && light !== dark }).toEqual({ name, paired: true });
        if (lightInLight !== null && lightInDark !== null) {
          expect({ name, darkerInLight: lightInLight < lightInDark }).toEqual({
            name,
            darkerInLight: true,
          });
        }
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

  it('sizes each width utility to the width token its name says', () => {
    const layout = style('utilities/layout.css');

    for (const step of WIDTH_STEPS) {
      const selector = `.w-${step}`;

      expect({ selector, body: declarations(ruleBody(layout, selector)) }).toEqual({
        selector,
        body: [`inline-size: var(--width-${step})`],
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

  it('fills a narrow screen with a filling modal, drops its card chrome and contains its scroll', () => {
    const narrow = mediaBlock(style('components/modal/modal.css'), '(width < 48rem)');
    const panel = declarations(ruleBody(narrow, '.modal-fill-narrow > .modal'));

    expect(panel).toEqual(
      expect.arrayContaining([
        'block-size: 100dvh',
        'max-inline-size: none',
        'margin: 0',
        'border-radius: 0',
        'box-shadow: none',
      ]),
    );
    expect(panel.some((line) => line.includes('env(safe-area-inset-top'))).toBe(true);
    expect(declarations(ruleBody(narrow, '.modal-fill-narrow'))).toEqual([
      'padding: 0',
      'background-color: transparent',
    ]);
    expect(declarations(ruleBody(narrow, '.modal-fill-narrow .modal-body'))).toContain(
      'overscroll-behavior: contain',
    );
  });

  it('shows fill-only content only while a modal fills the screen, and hides panel-only content then', () => {
    const modal = style('components/modal/modal.css');

    expect(
      declarations(
        ruleBody(mediaBlock(modal, '(width < 48rem)'), '.modal-fill-narrow .modal-panel-only'),
      ),
    ).toEqual(['display: none']);
    expect(
      declarations(
        ruleBody(mediaBlock(modal, '(width >= 48rem)'), '.modal-fill-narrow .modal-fill-only'),
      ),
    ).toEqual(['display: none']);
    expect(
      declarations(ruleBody(modal, '.modal-backdrop:not(.modal-fill-narrow) .modal-fill-only')),
    ).toEqual(['display: none']);
  });

  it('draws the clear button of a clearable field only on a coarse pointer, in place of the native one', () => {
    const field = style('components/forms/search-field.css');
    const coarse = mediaBlock(field, '(pointer: coarse)');

    expect(declarations(ruleBody(field, '.search-field-clearable .search-field-clear'))).toEqual([
      'display: none',
    ]);
    expect(declarations(ruleBody(coarse, '.search-field-clearable .search-field-clear'))).toContain(
      'display: inline-flex',
    );
    expect(field.indexOf('.search-field-clearable .search-field-clear {')).toBeLessThan(
      field.indexOf(coarse),
    );
    expect(
      declarations(
        ruleBody(coarse, '.search-field-clearable .input::-webkit-search-cancel-button'),
      ),
    ).toEqual(['display: none']);
    expect(style('components/forms/control.css')).not.toContain('clear');
  });

  it('hides a touch-hidden element only on a coarse pointer', () => {
    const state = style('utilities/state.css');

    expect(
      declarations(ruleBody(mediaBlock(state, '(pointer: coarse)'), '.hidden-on-touch')),
    ).toEqual(['display: none']);
    expect(
      definesClass(state.replace(mediaBlock(state, '(pointer: coarse)'), ''), 'hidden-on-touch'),
    ).toBe(false);
  });

  it('removes the padding of a flush modal body', () => {
    expect(
      declarations(ruleBody(style('components/modal/modal.css'), '.modal-body-flush')),
    ).toEqual(['padding: 0']);
  });

  it('caps an empty state message at the prose measure only when the state fills its area', () => {
    const emptyState = style('components/empty-state.css');
    const capping = rules(emptyState).filter((rule) =>
      declarations(rule.body).includes('max-inline-size: var(--container-prose)'),
    );

    expect(capping.flatMap((rule) => rule.selectors)).toEqual([
      '.empty-state-fill > .empty-state-message',
    ]);
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
      'background-color: var(--color-chosen-fill, var(--color-selected))',
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

  it('pins a bar across the full width of its positioned ancestor at the edge its name says, lifts a bottom-pinned one by the offset its ancestor sets, and floats a callout a step below the offset its ancestor drops it by', () => {
    const layout = style('utilities/layout.css');
    const placed: readonly (readonly [string, readonly string[]])[] = [
      ['.pin-top', ['inset-block-start: 0', 'inset-inline: 0', 'position: absolute']],
      ['.pin-bottom', ['inset-block-end: 0', 'inset-inline: 0', 'position: absolute']],
      ['.pin-lift', ['inset-block-end: var(--pin-lift, 0px)']],
      [
        '.callout-top-start',
        [
          'inset-block-start: calc(var(--pin-drop, 0px) + var(--sp-3))',
          'inset-inline-start: var(--sp-3)',
          'max-inline-size: calc(100% - 2 * var(--sp-3))',
          'position: absolute',
        ],
      ],
      [
        '.callout-top-center',
        [
          'inline-size: max-content',
          'inset-block-start: calc(var(--pin-drop, 0px) + var(--sp-3))',
          'inset-inline-start: 50%',
          'max-inline-size: min(var(--container-prose), 100% - 2 * var(--sp-3))',
          'position: absolute',
          'translate: -50% 0',
        ],
      ],
    ];

    for (const [selector, declared] of placed) {
      expect(everyDeclarationFor(layout, selector).toSorted(), selector).toEqual(declared);
    }
    expect(declarations(ruleBody(layout, '.relative'))).toEqual(['position: relative']);
    expect(layout.indexOf('.pin-lift {')).toBeGreaterThan(layout.indexOf('.pin-bottom {'));
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
    expect(definitionValues(style('tokens/layout.css')).get('--breakpoint-compact')).toBe(
      'var(--ds-size-compact)',
    );
    expect(definitionValues(style('base/primitives.css')).get('--ds-size-compact')).toBe(
      '43.75rem',
    );
  });

  it('switches every query that names the narrow breakpoint at the value of its token, and the TypeScript query too', () => {
    const narrow = definitionValues(style('base/primitives.css')).get('--ds-size-narrow') ?? '';
    const counts = sourceStylesheets()
      .map(
        (path) =>
          [path, queryWidths(sourceStyle(path)).filter((width) => width === narrow)] as const,
      )
      .filter(([, widths]) => widths.length > 0)
      .map(([path, widths]) => [path, widths.length] as const);

    expect(definitionValues(style('tokens/layout.css')).get('--breakpoint-narrow')).toBe(
      'var(--ds-size-narrow)',
    );
    expect(narrow).toBe('48rem');
    expect(Object.fromEntries(counts)).toEqual(NARROW_QUERIES);
    expect(NARROW_SCREEN_QUERY).toBe(`(width < ${narrow})`);
  });

  it('switches every media and container query at a width on the breakpoint scale', () => {
    const narrow = definitionValues(style('base/primitives.css')).get('--ds-size-narrow') ?? '';
    const scale = new Set([...BREAKPOINT_SCALE, narrow]);
    const offScale = sourceStylesheets().flatMap((path) =>
      queryWidths(sourceStyle(path))
        .filter((width) => !scale.has(width))
        .map((width) => `${path}: ${width}`),
    );

    expect(offScale).toEqual([]);
  });

  it('holds the z-index scale the contract locks', () => {
    const primitives = style('base/primitives.css');

    for (const [name, value] of Object.entries(LOCKED_Z_SCALE)) {
      expect(new RegExp(`${name}:\\s*${value};`, 'u').test(primitives)).toBe(true);
    }
  });

  it('strokes every icon without a fixed stroke at the theme icon stroke, at zero specificity', () => {
    const icon = style('components/icon.css');

    expect(declarations(ruleBody(icon, ':where(.lucide:not([data-fixed-stroke]))'))).toEqual([
      'stroke-width: var(--icon-stroke)',
    ]);
    expect(definitionValues(style('tokens/icons.css')).get('--icon-stroke')).toBe(
      'var(--ds-icon-stroke)',
    );
  });

  it('draws no icon from a mask or a data url', () => {
    for (const path of designSystemFiles()) {
      const css = style(path);

      expect({ path, mask: /(?:^|[\s;{])mask(?:-image)?\s*:/u.test(css) }).toEqual({
        path,
        mask: false,
      });
      expect({ path, data: css.includes('url("data:') }).toEqual({ path, data: false });
    }
  });

  it('shows the check only on a checked box that is not indeterminate, and the dash only on an indeterminate one', () => {
    const checkbox = style('components/forms/checkbox.css');
    const shown = ruleFor(checkbox, '.checkbox-input:indeterminate ~ .checkbox-dash');

    expect(shown.selectors.toSorted()).toEqual([
      '.checkbox-input:checked:not(:indeterminate) ~ .checkbox-check',
      '.checkbox-input:indeterminate ~ .checkbox-dash',
    ]);
    expect(declarations(shown.body)).toEqual(['transform: scale(1)']);
    expect(declarations(ruleBody(checkbox, '.checkbox-icon'))).toEqual(
      expect.arrayContaining([
        'transform: scale(0)',
        'color: var(--color-text-on-primary)',
        'stroke-width: calc(var(--icon-stroke) * 1.5)',
      ]),
    );
    expect(declarations(ruleBody(checkbox, '.checkbox-input:disabled ~ .checkbox-icon'))).toEqual([
      'color: var(--color-disabled)',
    ]);
  });

  it('turns the chevron of an open accordion item and of an open dropdown upside down', () => {
    const accordion = style('components/accordion.css');
    const dropdown = style('components/dropdown.css');

    expect(
      declarations(
        ruleBody(accordion, '.accordion-item[open] > .accordion-trigger > .accordion-icon'),
      ),
    ).toEqual(['transform: rotate(180deg)']);
    expect(accordion).not.toContain('is-open');
    expect(
      declarations(ruleBody(dropdown, '.dropdown.is-open > .dropdown-trigger > .dropdown-icon')),
    ).toEqual(['transform: rotate(180deg)']);
  });

  it('shows the select chevron only inside a field control, placed at its inline end', () => {
    const select = style('components/forms/select.css');

    expect(declarations(ruleBody(select, '.select-icon'))).toEqual(['display: none']);
    expect(declarations(ruleBody(select, '.field-control > .select-icon'))).toEqual(
      expect.arrayContaining([
        'display: block',
        'position: absolute',
        'inset-inline-end: var(--sp-3)',
        'pointer-events: none',
      ]),
    );
  });

  it('colours each status icon with the foreground of its alert or toast', () => {
    expect(declarations(ruleBody(style('components/alert.css'), '.alert-icon'))).toContain(
      'color: var(--_alert-fg)',
    );
    expect(declarations(ruleBody(style('components/toast.css'), '.toast-icon'))).toContain(
      'color: var(--_toast-fg)',
    );
  });

  it('rules a line between the rows of a separated list group and of its summary, and clips only a separated box', () => {
    const css = style('components/list-group.css');
    const rule = ruleFor(css, '.list-group-separated .list-group-list > * + *');

    expect(rule.selectors).toContain('.list-group-summary > * + *');
    expect(declarations(rule.body)).toEqual([
      'border-block-start: var(--border-width) solid var(--border-color)',
    ]);
    expect(declarations(ruleBody(css, '.list-group-separated > .list-group-box'))).toEqual([
      'overflow: hidden',
    ]);
    expect(declarations(ruleBody(css, '.list-group-box'))).not.toContain('overflow: hidden');
  });

  it('joins the buttons of a button group: shared corners square, shared borders overlapped, no shadow', () => {
    const css = style('components/btn-group.css');

    expect(declarations(ruleBody(css, '.btn-group > .btn'))).toEqual(['box-shadow: none']);
    expect(declarations(ruleBody(css, '.btn-group > .btn:not(:first-child)'))).toEqual([
      'margin-inline-start: calc(-1 * var(--border-width))',
      'border-start-start-radius: var(--radius-none)',
      'border-end-start-radius: var(--radius-none)',
    ]);
    expect(declarations(ruleBody(css, '.btn-group > .btn:not(:last-child)'))).toEqual([
      'border-start-end-radius: var(--radius-none)',
      'border-end-end-radius: var(--radius-none)',
    ]);
    expect(everyDeclarationFor(css, '.btn-group > .btn.is-active')).toEqual([
      'z-index: var(--z-raised)',
    ]);
  });

  it('joins every child of an input group the same way and lets the input take the room', () => {
    const css = style('components/forms/input-group.css');

    expect(declarations(ruleBody(css, '.input-group > :not(:first-child)'))).toEqual([
      'margin-inline-start: calc(-1 * var(--border-width))',
      'border-start-start-radius: var(--radius-none)',
      'border-end-start-radius: var(--radius-none)',
    ]);
    expect(declarations(ruleBody(css, '.input-group > :not(:last-child)'))).toEqual([
      'border-start-end-radius: var(--radius-none)',
      'border-end-end-radius: var(--radius-none)',
    ]);
    expect(declarations(ruleBody(css, '.input-group > .input'))).toEqual([
      'flex: 1 1 0',
      'min-inline-size: 0',
    ]);
    expect(everyDeclarationFor(css, '.input-group > .input:focus')).toEqual([
      'z-index: var(--z-raised)',
    ]);
  });

  it('sets an inline field label beside its control at the label width, wrapping the control under it when tight', () => {
    const css = style('components/forms/field.css');

    expect(declarations(ruleBody(css, '.field-inline'))).toEqual(
      expect.arrayContaining(['display: flex', 'flex-wrap: wrap']),
    );
    expect(declarations(ruleBody(css, '.field-inline > .field-label'))).toEqual([
      'flex: 1 0 var(--field-label-width)',
    ]);
    expect(declarations(ruleBody(css, '.field-inline > .field-control'))).toEqual([
      'flex: 999 1 calc(2 * var(--field-label-width))',
      'min-inline-size: 0',
    ]);
    expect(everyDeclarationFor(css, '.field-inline > .field-error')).toEqual(['flex-basis: 100%']);
  });

  it('squares a banner alert and drops its inline borders', () => {
    expect(declarations(ruleBody(style('components/alert.css'), '.alert-banner'))).toEqual([
      'border-inline: none',
      'border-radius: var(--radius-none)',
    ]);
  });

  it('places a top toast region at the top edge, clear of the safe area, and centres it', () => {
    expect(declarations(ruleBody(style('components/toast.css'), '.toast-region-top'))).toEqual([
      'inset-block-start: calc(var(--_toast-gutter) + env(safe-area-inset-top, 0px))',
      'inset-block-end: auto',
      'inset-inline: 0',
      'margin-inline: auto',
    ]);
  });

  it('paints the page backdrop over the page colour on the body, fixed to the viewport, on the app shell and on the page surface', () => {
    const body = everyDeclarationFor(style('base/elements.css'), 'body');
    const shell = everyDeclarationFor(style('utilities/layout.css'), '.layout-app-shell');
    const page = everyDeclarationFor(style('utilities/surface.css'), '.surface-bg');

    expect(body).toEqual(
      expect.arrayContaining([
        'background-color: var(--color-bg)',
        'background-image: var(--page-backdrop)',
        'background-attachment: fixed',
      ]),
    );
    for (const painted of [shell, page]) {
      expect(painted).toEqual(
        expect.arrayContaining([
          'background-color: var(--color-bg)',
          'background-image: var(--page-backdrop)',
        ]),
      );
    }
  });

  it('sets no page backdrop in the default theme', () => {
    expect(declarations(ruleBody(themeSheets(), ":root[data-theme='base']"))).toContain(
      '--ds-page-backdrop: none',
    );
  });

  it('draws the YoRHa backdrop as a grid of lines at one spacing in both directions', () => {
    const backdrop = definitionValues(roleBody('yorha')).get('--ds-page-backdrop');
    const line = (angle: string) =>
      `repeating-linear-gradient(${angle}, var(--ds-grid-line) 0 1px, transparent 1px 4px)`;

    expect(backdrop).toBe(`${line('0deg')}, ${line('90deg')}`);
  });

  it('names a declared keyframe, or none, in every motion primitive of every theme', () => {
    const declared = new Set(keyframesIn(style('utilities/animation.css')).concat('none'));
    const named = themeRules(themeSheets()).flatMap((rule) =>
      Array.from(definitionValues(rule.body)).filter(([name]) => name.startsWith('--ds-motion-')),
    );
    const unknown = named.filter(([, value]) => !declared.has(value));

    expect(named.length).toBeGreaterThan(0);
    expect(unknown).toEqual([]);
  });

  it('animates overlays, menus, toasts, file items and panels with the keyframe their motion token names, in a longhand a none cannot shift', () => {
    const animated = [
      [
        'components/modal/modal-transitions.css',
        '.modal-backdrop[open] .modal',
        'overlay-in',
        'var(--dur-moderate) var(--ease-spring) both',
      ],
      [
        'components/modal/modal-transitions.css',
        '.modal-backdrop.is-leaving .modal',
        'overlay-out',
        'var(--transition-exit) both',
      ],
      [
        'components/dropdown.css',
        '.dropdown-menu:popover-open',
        'menu-in',
        'var(--transition-enter) both',
      ],
      ['components/toast.css', '.toast', 'toast-in', 'var(--dur-moderate) var(--ease-spring) both'],
      ['components/toast.css', '.toast.is-leaving', 'toast-out', 'var(--transition-exit) forwards'],
      ['components/file-list.css', '.file-item', 'item-in', 'var(--transition-enter) both'],
      [
        'components/tabs.css',
        '.tab-panel:not([hidden])',
        'panel-in',
        'var(--transition-enter) both',
      ],
      [
        'components/accordion.css',
        '.accordion-item[open] > .accordion-body',
        'panel-in',
        'var(--transition-enter) both',
      ],
    ] as const;

    for (const [path, selector, motion, timing] of animated) {
      const lines = everyDeclarationFor(style(path), selector).filter((line) =>
        line.startsWith('animation'),
      );

      expect({ selector, lines }).toEqual({
        selector,
        lines: [`animation: ${timing}`, `animation-name: var(--motion-${motion})`],
      });
    }
  });

  it('makes every transition instant and undelayed when motion is reduced', () => {
    const reduced = mediaBlock(
      style('overrides/overrides.css'),
      '(prefers-reduced-motion: reduce)',
    );
    const everything = rules(reduced).find((rule) => rule.selectors.includes('*'));

    expect(everything?.body).toContain('transition-duration: 0s;');
    expect(everything?.body).toContain('transition-delay: 0s;');
  });

  it('stops the panel entrances when motion is reduced', () => {
    const reduced = mediaBlock(
      style('overrides/overrides.css'),
      '(prefers-reduced-motion: reduce)',
    );
    const stopped = rules(reduced).find((rule) => rule.body.includes('animation: none'));

    expect(stopped?.selectors).toEqual(expect.arrayContaining(['.tab-panel', '.accordion-body']));
  });

  it('keeps the plain hover of every theme that sets no hover text: its tints, no solid fill, no sweep, no marker', () => {
    const plain = themeRules(themeSheets())
      .map((rule) => definitionValues(rule.body))
      .filter((values) => values.get('--ds-hover-text') === 'initial');

    expect(plain.length).toBeGreaterThan(1);
    for (const values of plain) {
      expect({
        fill: values.get('--ds-hover-fill'),
        press: values.get('--ds-press-fill'),
        soft: values.get('--ds-hover-fill-soft'),
        solid: values.get('--ds-hover-fill-solid'),
        solidText: values.get('--ds-hover-text-solid'),
        chosenFill: values.get('--ds-chosen-fill'),
        chosenText: values.get('--ds-chosen-text'),
        glow: values.get('--ds-hover-glow'),
        rule: values.get('--ds-hover-rule-width'),
        sweep: values.get('--ds-dur-sweep'),
        textDuration: values.get('--ds-dur-hover-text'),
        textEasing: values.get('--ds-easing-hover-text'),
        marker: values.get('--ds-marker-width'),
      }).toEqual({
        fill: values.get('--ds-hover'),
        press: values.get('--ds-active'),
        soft: 'transparent',
        solid: 'transparent',
        solidText: 'initial',
        chosenFill: 'initial',
        chosenText: 'initial',
        glow: 'initial',
        rule: '0px',
        sweep: '0s',
        textDuration: 'var(--ds-dur-flash)',
        textEasing: 'var(--ds-ease-smooth)',
        marker: '0px',
      });
    }
  });

  it('sweeps the hover fill in from the start of buttons, nav links, tabs, accordion triggers, menu items, command rows, segmented items, tags and pagination items', () => {
    const swept = [
      ['components/btn.css', '.btn', '.btn:hover'],
      ['components/nav/nav-link.css', '.nav-link', '.nav-link:hover'],
      ['components/tabs.css', '.tab', '.tab:hover'],
      ['components/accordion.css', '.accordion-trigger', '.accordion-trigger:hover'],
      ['components/dropdown.css', '.dropdown-item', '.dropdown-item:hover'],
      ['components/command.css', '.command-item', '.command-item:hover'],
      ['components/segmented.css', '.segmented-item', '.segmented-item:hover'],
      ['components/tag.css', 'button.tag', 'button.tag:hover'],
      ['components/tag.css', 'a.tag', 'a.tag:hover'],
      ['components/nav/pagination.css', '.pagination-item', '.pagination-item:hover'],
    ] as const;

    for (const [path, rest, hover] of swept) {
      const resting = everyDeclarationFor(style(path), rest);

      expect({ rest, resting }).toEqual({
        rest,
        resting: expect.arrayContaining([
          'background-repeat: no-repeat',
          'background-position: left center',
          'background-size: 0% 100%',
          expect.stringMatching(/^background-image: /u),
          expect.stringMatching(/^transition: .*background-size var\(--transition-sweep\)/u),
          expect.stringMatching(/^transition: .*color var\(--transition-hover-text\)/u),
        ]),
      });
      expect(everyDeclarationFor(style(path), hover)).toContain('background-size: 100% 100%');
    }
  });

  it('marks a hovered nav link, accordion trigger and menu item with an inline-start bar of the marker width', () => {
    const marker =
      /^box-shadow: inset var\(--hover-marker-width\) 0 0 var\(--(?:color-hover-marker|_dropdown-item-marker)\)$/u;

    expect(
      everyDeclarationFor(style('components/nav/nav-link.css'), '.nav-link:hover'),
    ).toContainEqual(expect.stringMatching(marker));
    expect(
      everyDeclarationFor(style('components/accordion.css'), '.accordion-trigger:hover'),
    ).toContainEqual(expect.stringMatching(marker));
    expect(
      everyDeclarationFor(style('components/dropdown.css'), '.dropdown-item:hover'),
    ).toContainEqual(expect.stringMatching(marker));
  });

  it('draws no marker bar and no rust in the YoRHa hover', () => {
    const values = definitionValues(roleBody('yorha'));

    expect([values.get('--ds-marker-width'), values.get('--ds-marker')]).toEqual([
      '0px',
      'var(--ds-khaki-ink)',
    ]);
    expect({
      link: values.get('--ds-text-link-hover'),
      accent: values.get('--ds-accent-hover'),
      glow: values.get('--ds-hover-glow'),
    }).toEqual({
      link: 'var(--ds-khaki-ink-hover)',
      accent: 'var(--ds-khaki-ink-hover)',
      glow: 'var(--ds-khaki-glow)',
    });
  });

  it('rings a hovered primary or accent button in the hover glow, falling back to its own glow', () => {
    const btn = style('components/btn.css');

    for (const tone of ['primary', 'accent'] as const) {
      expect(definitionValues(ruleBody(btn, `.btn-${tone}`)).get('--_btn-tone-hover-shadow')).toBe(
        `0 0 0 var(--glow-ring-width) var(--color-hover-glow, var(--color-${tone}-glow))`,
      );
    }
  });

  it('rounds every capsule with the pill radius and every circular mark with the round radius', () => {
    const shaped = [
      ['components/badge.css', '.badge', 'pill'],
      ['components/tag.css', '.tag', 'pill'],
      ['components/progress.css', '.progress-track', 'pill'],
      ['components/forms/toggle.css', '.toggle-input', 'pill'],
      ['overrides/overrides.css', '.btn.btn-pill', 'pill'],
      ['components/badge.css', '.badge-dot::before', 'round'],
      ['components/tag.css', '.tag-remove', 'round'],
      ['components/forms/toggle.css', '.toggle-input::before', 'round'],
      ['components/forms/radio.css', '.radio-input', 'round'],
      ['components/forms/radio.css', '.radio-input::before', 'round'],
      ['components/avatar.css', '.avatar', 'round'],
      ['components/skeleton.css', '.skeleton-circle', 'round'],
      ['components/forms/dropzone.css', '.window-dropzone-icon-frame', 'round'],
    ] as const;

    for (const [path, selector, shape] of shaped) {
      expect({ selector, radius: everyDeclarationFor(style(path), selector) }).toEqual({
        selector,
        radius: expect.arrayContaining([`border-radius: var(--radius-${shape})`]),
      });
    }
  });

  it('keeps the pill and round radii fully rounded in the default theme', () => {
    const values = definitionValues(ruleBody(themeSheets(), ":root[data-theme='base']"));

    expect([values.get('--ds-radius-pill'), values.get('--ds-radius-round')]).toEqual([
      'var(--ds-radius-full)',
      'var(--ds-radius-full)',
    ]);
  });

  it('draws a chosen nav link, tab, menu item, command row, segmented item, tag and pagination item in the chosen colours, falling back to its own', () => {
    const chosen = [
      [
        'components/nav/nav-link.css',
        '.nav-link.is-active',
        'var(--color-brand-text)',
        'var(--color-selected)',
      ],
      ['components/tabs.css', '.tab.is-active', 'var(--color-text)', 'transparent'],
      [
        'components/dropdown.css',
        '.dropdown-item.is-active',
        'var(--color-brand-text)',
        'var(--color-selected)',
      ],
      [
        'components/command.css',
        '.command-item.is-selected',
        'var(--color-brand-text)',
        'var(--color-selected)',
      ],
      [
        'components/segmented.css',
        '.segmented-item.is-active',
        'var(--color-text)',
        'var(--color-surface-raised)',
      ],
      [
        'components/tag.css',
        '.tag.is-active',
        'var(--_tag-on, var(--color-brand-text))',
        'var(--_tag-text, var(--color-selected))',
      ],
      [
        'components/nav/pagination.css',
        '.pagination-item.is-active',
        'var(--color-text-on-primary)',
        'var(--color-primary)',
      ],
    ] as const;

    for (const [path, selector, text, fill] of chosen) {
      expect({ selector, lines: everyDeclarationFor(style(path), selector) }).toEqual({
        selector,
        lines: expect.arrayContaining([
          `color: var(--color-chosen-text, ${text})`,
          `background-color: var(--color-chosen-fill, ${fill})`,
        ]),
      });
    }
    expect(everyDeclarationFor(style('components/btn.css'), '.btn.is-active')).toEqual(
      expect.arrayContaining([
        'color: var(--color-chosen-text, var(--_btn-fg))',
        'background-image: linear-gradient(var(--color-chosen-fill, var(--color-active)) 0 0)',
      ]),
    );
  });

  it('borders a hovered or chosen tag in the chosen fill, falling back to its own border', () => {
    const tag = style('components/tag.css');

    for (const [selector, own] of [
      ['button.tag:hover', 'var(--border-color-strong)'],
      ['a.tag:hover', 'var(--border-color-strong)'],
      ['.tag.is-active', 'var(--color-brand-border-mid)'],
    ] as const) {
      expect({ selector, lines: everyDeclarationFor(tag, selector) }).toEqual({
        selector,
        lines: expect.arrayContaining([
          `border-color: var(--color-chosen-fill, var(--_tag-border, ${own}))`,
        ]),
      });
    }
  });

  it('rules a line above and below a hovered or chosen item, a gap away, in the hover rule colour and timing', () => {
    const ruled = [
      ['components/btn.css', '.btn', ['.btn:hover', '.btn.is-active']],
      ['components/nav/nav-link.css', '.nav-link', ['.nav-link:hover', '.nav-link.is-active']],
      ['components/accordion.css', '.accordion-trigger', ['.accordion-trigger:hover']],
      [
        'components/dropdown.css',
        '.dropdown-item',
        ['.dropdown-item:hover', '.dropdown-item.is-active'],
      ],
      [
        'components/command.css',
        '.command-item',
        ['.command-item:hover', '.command-item.is-selected'],
      ],
      [
        'components/segmented.css',
        '.segmented-item',
        ['.segmented-item:hover', '.segmented-item.is-active'],
      ],
      ['components/tag.css', 'button.tag', ['button.tag:hover', '.tag.is-active']],
      ['components/tag.css', 'a.tag', ['a.tag:hover', '.tag.is-active']],
      [
        'components/nav/pagination.css',
        '.pagination-item',
        ['.pagination-item:hover', '.pagination-item.is-active'],
      ],
    ] as const;

    for (const [path, host, shown] of ruled) {
      const css = style(path);
      const line = everyDeclarationFor(css, `${host}::before`);

      expect(everyDeclarationFor(css, host)).toContain('position: relative');
      expect({ host, line }).toEqual({
        host,
        line: expect.arrayContaining([
          "content: ''",
          'position: absolute',
          'border-block: var(--hover-rule-width) solid transparent',
          'pointer-events: none',
          'transition: border-color var(--transition-sweep)',
          expect.stringMatching(
            /^inset-block: calc\(\(var\(--hover-rule-gap\) \+ var\(--hover-rule-width\)/u,
          ),
        ]),
      });
      for (const state of shown) {
        expect(everyDeclarationFor(css, `${state}::before`)).toContain(
          'border-block-color: var(--color-hover-rule)',
        );
      }
    }
  });

  it('leaves the clip, the corners and the placeholder to the parent of a filling thumbnail', () => {
    expect(declarations(ruleBody(style('components/thumbnail.css'), '.thumbnail-fill'))).toEqual([
      'inline-size: 100%',
      'block-size: 100%',
      'overflow: visible',
      'background-color: transparent',
      'border-radius: 0',
    ]);
  });
});
