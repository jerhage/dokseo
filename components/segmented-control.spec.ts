import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { SEGMENTED_VARIANTS, segmentLook } from './segmented-control';
import SegmentedControl from './SegmentedControl.svelte';

const CONTROL = SegmentedControl as unknown as Component<Record<string, unknown>>;

const OPTIONS = [
  { value: 'grid', label: 'Covers' },
  { value: 'list', label: 'List' },
  { value: 'shelf', label: 'Shelf', disabled: true },
];

function markup(props: Record<string, unknown>): string {
  return render(CONTROL, {
    props: { options: OPTIONS, value: 'list', ...props },
  }).body;
}

function buttons(html: string): string[] {
  return html.match(/<button[^>]*>/gu) ?? [];
}

describe('segmentLook', () => {
  it.each([
    [
      'every segment as a default button in the default variant',
      'default',
      { kind: 'button', variant: 'default' },
      { kind: 'button', variant: 'default' },
    ],
    [
      'every segment as a ghost button in the ghost variant',
      'ghost',
      { kind: 'button', variant: 'ghost' },
      { kind: 'button', variant: 'ghost' },
    ],
    [
      'only the chosen segment outlined in the outline variant',
      'outline',
      { kind: 'button', variant: 'outline' },
      { kind: 'button', variant: 'default' },
    ],
    ['chips in the track variant', 'track', { kind: 'chip' }, { kind: 'chip' }],
  ] as const)('draws %s', (_case, variant, chosen, other) => {
    expect(segmentLook(variant, true)).toEqual(chosen);
    expect(segmentLook(variant, false)).toEqual(other);
  });
});

describe('SEGMENTED_VARIANTS', () => {
  it('adds the track class to the track variant only', () => {
    expect(SEGMENTED_VARIANTS).toEqual({
      default: [],
      ghost: [],
      outline: [],
      track: ['segmented-track'],
    });
  });
});

describe('SegmentedControl', () => {
  it('presses exactly the chosen option', () => {
    const pressed = buttons(markup({})).map((tag) => /aria-pressed="(\w+)"/u.exec(tag)?.[1]);

    expect(pressed).toEqual(['false', 'true', 'false']);
  });

  it('presses nothing when no option is chosen', () => {
    expect(markup({ value: undefined })).not.toContain('aria-pressed="true"');
  });

  it('disables a disabled option only', () => {
    const disabled = buttons(markup({})).map((tag) => tag.includes('disabled'));

    expect(disabled).toEqual([false, false, true]);
  });

  it('names the group by its label', () => {
    const html = markup({ label: 'Show books as' });

    expect(html).toMatch(/<div[^>]*role="group"[^>]*aria-label="Show books as"/u);
  });

  it('names the group by the element it is labelled by', () => {
    const html = markup({ 'aria-labelledby': 'x-language' });

    expect(html).toMatch(/<div[^>]*role="group"[^>]*aria-labelledby="x-language"/u);
  });

  it('renders no group role when it is not named', () => {
    expect(markup({})).not.toContain('role=');
  });

  it('renders small buttons, the chosen one active, in a button variant', () => {
    const [covers, list] = buttons(markup({ variant: 'outline' }));

    expect(covers).toContain('class="btn btn-sm"');
    expect(list).toContain('class="btn btn-outline btn-primary btn-sm is-active"');
  });

  it('renders its own items inside the track in the track variant', () => {
    const html = markup({ variant: 'track', class: 'modal-fill-only' });
    const [covers, list] = buttons(html);

    expect(html).toMatch(/<div[^>]*class="segmented segmented-track modal-fill-only"/u);
    expect(covers).toContain('class="segmented-item"');
    expect(list).toContain('class="segmented-item is-active"');
    expect(list).toContain('type="button"');
  });
});
