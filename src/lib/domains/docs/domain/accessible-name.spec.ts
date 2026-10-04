import { describe, expect, it } from 'vitest';
import { accessReading, roleOf } from './accessible-name';
import type { AccessElement, AccessNode } from './accessible-name';

function text(value: string): AccessNode {
  return { kind: 'text', text: value };
}

function element(
  tag: string,
  attributes: Record<string, string> = {},
  children: readonly AccessNode[] = [],
  extra: Partial<AccessElement> = {},
): AccessElement {
  return {
    kind: 'element',
    tag,
    attributes,
    hidden: false,
    focusable: false,
    children,
    labels: [],
    labelledBy: [],
    describedBy: [],
    ...extra,
  };
}

describe('roleOf', () => {
  it('reads the implicit role of native elements', () => {
    expect(roleOf(element('button'))).toBe('button');
    expect(roleOf(element('a', { href: '/' }))).toBe('link');
    expect(roleOf(element('a'))).toBe('generic');
    expect(roleOf(element('input'))).toBe('textbox');
    expect(roleOf(element('input', { type: 'search' }))).toBe('searchbox');
    expect(roleOf(element('input', { type: 'range' }))).toBe('slider');
    expect(roleOf(element('dialog'))).toBe('dialog');
    expect(roleOf(element('h2'))).toBe('heading');
    expect(roleOf(element('div'))).toBe('generic');
  });

  it('prefers the first token of an explicit role', () => {
    expect(roleOf(element('input', { type: 'checkbox', role: 'switch' }))).toBe('switch');
    expect(roleOf(element('div', { role: ' status alert' }))).toBe('status');
  });
});

describe('accessReading', () => {
  it('names a button from its text, with whitespace collapsed', () => {
    const reading = accessReading(element('button', {}, [text('  Save \n  draft ')]));

    expect(reading).toMatchObject({
      role: 'button',
      name: 'Save draft',
      source: 'content',
    });
  });

  it('names an icon button from its hidden text and skips the hidden icon', () => {
    const icon = element('svg', { 'aria-hidden': 'true' }, [text('x')], {
      hidden: true,
    });
    const hiddenText = element('span', { class: 'visually-hidden' }, [text('Close')]);

    expect(accessReading(element('button', {}, [icon, hiddenText])).name).toBe('Close');
  });

  it('reports an empty name for an icon button with nothing but an icon', () => {
    const icon = element('svg', { 'aria-hidden': 'true' }, [], {
      hidden: true,
    });

    expect(accessReading(element('button', {}, [icon]))).toMatchObject({
      name: '',
      source: 'none',
    });
  });

  it('prefers aria-labelledby, then aria-label, then the content', () => {
    const heading = element('h2', {}, [text('Reading settings')]);
    const both = element('button', { 'aria-label': 'Label' }, [text('Content')], {
      labelledBy: [heading],
    });

    expect(accessReading(both)).toMatchObject({
      name: 'Reading settings',
      source: 'aria-labelledby',
    });
    expect(
      accessReading(element('button', { 'aria-label': 'Label' }, [text('Content')])),
    ).toMatchObject({ name: 'Label', source: 'aria-label' });
  });

  it('names a field from its label and describes it from aria-describedby', () => {
    const label = element('label', {}, [text('Title')]);
    const hint = element('p', {}, [text('As it appears on the shelf.')]);
    const field = element('input', { 'aria-invalid': 'true' }, [], {
      labels: [label],
      describedBy: [hint],
      focusable: true,
    });

    expect(accessReading(field)).toEqual({
      hidden: false,
      role: 'textbox',
      name: 'Title',
      source: 'label',
      description: 'As it appears on the shelf.',
      states: ['focusable', 'invalid'],
    });
  });

  it('falls back to the title, then the placeholder', () => {
    expect(accessReading(element('input', { title: 'Find', placeholder: 'Search' }))).toMatchObject(
      { name: 'Find', source: 'title', description: '' },
    );
    expect(accessReading(element('input', { placeholder: 'Search' }))).toMatchObject({
      name: 'Search',
      source: 'placeholder',
    });
  });

  it('uses the title as the description when the name comes from elsewhere', () => {
    expect(accessReading(element('button', { title: 'Close' }, [text('X')])).description).toBe(
      'Close',
    );
  });

  it('gives no description from a title that repeats the name, as Chromium does', () => {
    expect(accessReading(element('button', { title: 'Close' }, [text('Close')])).description).toBe(
      '',
    );
  });

  it('gives a clickable div no name from its content, because generic is not named from content', () => {
    expect(accessReading(element('div', { onclick: '' }, [text('Next page')]))).toMatchObject({
      role: 'generic',
      name: '',
      states: ['not focusable'],
    });
  });

  it('names an image from its alt and treats an empty alt as presentation', () => {
    expect(accessReading(element('img', { alt: 'Cover' }))).toMatchObject({
      role: 'img',
      name: 'Cover',
      source: 'alt',
    });
    expect(roleOf(element('img', { alt: '' }))).toBe('presentation');
  });

  it('returns no name for a hidden element and reports it hidden', () => {
    expect(accessReading(element('button', {}, [text('Gone')], { hidden: true }))).toMatchObject({
      hidden: true,
      name: '',
    });
  });

  it('lists the disabled, expanded, pressed and modal states', () => {
    const states = accessReading(
      element('button', {
        disabled: '',
        'aria-expanded': 'false',
        'aria-pressed': 'true',
        'aria-modal': 'true',
      }),
    ).states;

    expect(states).toEqual(['not focusable', 'disabled', 'collapsed', 'pressed', 'modal']);
  });
});
