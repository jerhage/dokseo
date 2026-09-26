import { readFileSync, readdirSync } from 'node:fs';
import { createRawSnippet } from 'svelte';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import X from './X.svelte';
import { iconStroke, isDecorative } from './icon';

const ICONS = new URL('./', import.meta.url);
const SOURCE = new URL('../../../', import.meta.url);
const BASE = 'Icon.svelte';
const PLAYGROUND = 'routes/playground/';

type Attributes = Record<string, unknown>;

const CROSS = X as unknown as Component<Attributes>;

function markup(props: Attributes = {}): string {
  return render(CROSS, { props }).body;
}

function svgTag(html: string): string {
  return /<svg[^>]*>/u.exec(html)?.[0] ?? '';
}

function attribute(html: string, name: string): string | null {
  return new RegExp(`\\s${name}="([^"]*)"`, 'u').exec(svgTag(html))?.[1] ?? null;
}

function iconFiles(): readonly string[] {
  return readdirSync(ICONS)
    .filter((file) => file.endsWith('.svelte') && file !== BASE)
    .toSorted();
}

function kebab(component: string): string {
  return component.replaceAll(/(?<=[a-z0-9])(?=[A-Z])/gu, '-').toLowerCase();
}

function sourceFiles(): readonly string[] {
  return readdirSync(SOURCE, { recursive: true, encoding: 'utf8' })
    .map((path) => path.split('\\').join('/'))
    .filter((path) => /\.(svelte|ts)$/u.test(path))
    .filter((path) => !path.endsWith('.spec.ts'))
    .filter((path) => !path.startsWith(PLAYGROUND))
    .filter((path) => !path.startsWith('lib/components/icons/'));
}

describe('Icon', () => {
  it('renders the Lucide svg with its default attributes and the classes of the icon', () => {
    const html = markup();

    expect(attribute(html, 'xmlns')).toBe('http://www.w3.org/2000/svg');
    expect(attribute(html, 'viewBox')).toBe('0 0 24 24');
    expect(attribute(html, 'width')).toBe('24');
    expect(attribute(html, 'height')).toBe('24');
    expect(attribute(html, 'fill')).toBe('none');
    expect(attribute(html, 'stroke')).toBe('currentColor');
    expect(attribute(html, 'stroke-width')).toBe('2');
    expect(attribute(html, 'stroke-linecap')).toBe('round');
    expect(attribute(html, 'stroke-linejoin')).toBe('round');
    expect(attribute(html, 'class')).toBe('lucide lucide-x');
    expect(html).toContain('<path d="M18 6 6 18"');
    expect(html).toContain('<path d="m6 6 12 12"');
  });

  it('applies the size, colour, class and any other attribute it is given', () => {
    const html = markup({ size: 16, color: 'red', class: 'extra', id: 'mark', opacity: 0.5 });

    expect(attribute(html, 'width')).toBe('16');
    expect(attribute(html, 'height')).toBe('16');
    expect(attribute(html, 'stroke')).toBe('red');
    expect(attribute(html, 'class')).toBe('lucide lucide-x extra');
    expect(attribute(html, 'id')).toBe('mark');
    expect(attribute(html, 'opacity')).toBe('0.5');
  });

  it('hides itself from assistive technology unless it is given a name or a role', () => {
    const label = createRawSnippet(() => ({ render: () => '<title>Done</title>' }));

    expect(attribute(markup(), 'aria-hidden')).toBe('true');
    expect(attribute(markup({ 'aria-label': 'Done' }), 'aria-hidden')).toBeNull();
    expect(attribute(markup({ 'aria-labelledby': 'x' }), 'aria-hidden')).toBeNull();
    expect(attribute(markup({ title: 'Done' }), 'aria-hidden')).toBeNull();
    expect(attribute(markup({ role: 'img' }), 'aria-hidden')).toBeNull();
    expect(attribute(markup({ children: label }), 'aria-hidden')).toBeNull();
    expect(markup({ children: label })).toContain('<title>Done</title>');
  });

  it('leaves the stroke to the theme unless a stroke width is given', () => {
    expect(attribute(markup(), 'data-fixed-stroke')).toBeNull();
    expect(attribute(markup({ strokeWidth: 3 }), 'data-fixed-stroke')).toBe('');
    expect(attribute(markup({ strokeWidth: 3 }), 'stroke-width')).toBe('3');
  });

  it('scales an absolute stroke width by the grid over the size', () => {
    const html = markup({ size: 48, strokeWidth: 2, absoluteStrokeWidth: true });

    expect(attribute(html, 'stroke-width')).toBe('1');
    expect(attribute(html, 'data-fixed-stroke')).toBe('');
  });

  it('keeps every shape at its stroke width on screen when asked for a non-scaling stroke', () => {
    expect(markup({ nonScalingStroke: true })).toContain('vector-effect="non-scaling-stroke"');
    expect(markup()).not.toContain('vector-effect');
  });
});

describe('iconStroke', () => {
  it('defaults to the Lucide stroke width and leaves it to the theme', () => {
    expect(iconStroke(undefined, false, 24)).toEqual({ width: 2, fixed: false });
  });

  it('fixes a given stroke width', () => {
    expect(iconStroke(1.5, false, 24)).toEqual({ width: 1.5, fixed: true });
  });

  it('fixes an absolute stroke width at the stroke times the grid over the size', () => {
    expect(iconStroke(undefined, true, 12)).toEqual({ width: 4, fixed: true });
    expect(iconStroke(3, true, 36)).toEqual({ width: 2, fixed: true });
  });
});

describe('isDecorative', () => {
  it('reports an icon with no name, role or content as decorative', () => {
    expect(isDecorative({ class: 'x', id: 'y' }, false)).toBe(true);
  });

  it('reports an icon with an aria attribute, a role, a title or content as meaningful', () => {
    expect(isDecorative({ 'aria-label': 'Close' }, false)).toBe(false);
    expect(isDecorative({ 'aria-describedby': 'hint' }, false)).toBe(false);
    expect(isDecorative({ role: 'img' }, false)).toBe(false);
    expect(isDecorative({ title: 'Close' }, false)).toBe(false);
    expect(isDecorative({}, true)).toBe(false);
  });
});

describe('the icon set', () => {
  it('names each icon after the Lucide icon its file is named for', () => {
    for (const file of iconFiles()) {
      const component = file.slice(0, -'.svelte'.length);
      const source = readFileSync(new URL(file, ICONS), 'utf8');

      expect({ file, name: /\sname="([\w-]+)"/u.exec(source)?.[1] }).toEqual({
        file,
        name: kebab(component),
      });
    }
  });

  it('ships only icons that a component, a domain or a screen imports', () => {
    const sources = sourceFiles().map((path) => readFileSync(new URL(path, SOURCE), 'utf8'));
    const unused = iconFiles().filter((file) => {
      const pattern = new RegExp(`icons/${file.replace('.', '\\.')}['"]`, 'u');
      return !sources.some((text) => pattern.test(text));
    });

    expect(iconFiles().length).toBeGreaterThan(0);
    expect(unused).toEqual([]);
  });

  it('holds no index module that could re-export the set', () => {
    const indexes = readdirSync(ICONS).filter((file) => file.startsWith('index.'));

    expect(indexes).toEqual([]);
  });
});
