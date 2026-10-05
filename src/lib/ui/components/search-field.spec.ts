import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { CLEAR_LABEL, searchFieldId } from './search-field';
import SearchField from './SearchField.svelte';

const FIELD = SearchField as unknown as Component<Record<string, unknown>>;

function markup(props: Record<string, unknown>): string {
  return render(FIELD, { props: { label: 'Find a title', ...props } }).body.replaceAll(
    /<!--[^>]*-->/gu,
    '',
  );
}

function tag(html: string, name: string): string {
  return html.match(new RegExp(`<${name}[^>]*>`, 'u'))?.[0] ?? '';
}

describe('searchFieldId', () => {
  it('keeps an id the caller gives and derives one from the instance otherwise', () => {
    expect(searchFieldId('mine', 's1')).toBe('mine');
    expect(searchFieldId(undefined, 's1')).toBe('s1-search');
    expect(searchFieldId(null, 's1')).toBe('s1-search');
  });
});

describe('SearchField', () => {
  it('names the field with a label that points at it, visible unless hidden', () => {
    const shown = markup({});
    const input = tag(shown, 'input');
    const id = input.match(/ id="([^"]+)"/u)?.[1];

    expect(id).toBeDefined();
    expect(tag(shown, 'label')).toContain(`for="${id}"`);
    expect(tag(shown, 'label')).not.toContain('visually-hidden');
    expect(shown).toContain('>Find a title</label>');
    expect(tag(markup({ hideLabel: true }), 'label')).toContain('visually-hidden');
  });

  it('renders a search input by default and a text input when asked', () => {
    expect(tag(markup({}), 'input')).toContain('type="search"');
    expect(tag(markup({ type: 'text' }), 'input')).toContain('type="text"');
  });

  it('passes other input attributes to the input and the class to the root', () => {
    const html = markup({
      placeholder: 'Titles',
      enterkeyhint: 'search',
      role: 'combobox',
      class: 'flex-fill',
    });
    const input = tag(html, 'input');

    expect(input).toContain('placeholder="Titles"');
    expect(input).toContain('enterkeyhint="search"');
    expect(input).toContain('role="combobox"');
    expect(input).not.toContain('flex-fill');
    expect(tag(html, 'div')).toContain('search-field flex-fill');
  });

  it('draws a clear button only when the field is clearable and holds a value', () => {
    const clearable = markup({ clearable: true, value: 'kraken' });

    expect(clearable).toContain(`<span class="visually-hidden">${CLEAR_LABEL}</span>`);
    expect(tag(clearable, 'div')).toContain('search-field search-field-clearable');
    expect(markup({ clearable: true, value: '' })).not.toContain('<button');
    expect(markup({ value: 'kraken' })).not.toContain('<button');
    expect(markup({ value: 'kraken' })).not.toContain('search-field-clearable');
  });

  it('names the clear button by the clear label it is given', () => {
    const html = markup({ clearable: true, value: 'kraken', clearLabel: 'Empty the filter' });

    expect(html).toContain('<span class="visually-hidden">Empty the filter</span>');
  });
});
