import { createRawSnippet } from 'svelte';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import AccordionItem from './AccordionItem.svelte';
import Alert from './Alert.svelte';
import Breadcrumb from './Breadcrumb.svelte';
import Checkbox from './Checkbox.svelte';
import type { StatusVariant } from './classes';
import Dropdown from './Dropdown.svelte';
import Dropzone from './Dropzone.svelte';
import Field from './Field.svelte';
import FileItem from './FileItem.svelte';
import type { FileItemData } from './file-item';
import Modal from './Modal.svelte';
import Pagination from './Pagination.svelte';
import Select from './Select.svelte';
import StatusIcon from './StatusIcon.svelte';
import Tag from './Tag.svelte';
import Toast from './Toast.svelte';
import { Toaster } from './toaster.svelte';

type Attributes = Record<string, unknown>;

const TEXT = createRawSnippet(() => ({ render: () => '<span>Label</span>' }));

const STATUS_ICONS: Readonly<Record<StatusVariant, string>> = {
  info: 'info',
  success: 'circle-check',
  warning: 'triangle-alert',
  danger: 'circle-x',
};

function markup(component: unknown, props: Attributes): string {
  return render(component as Component<Attributes>, { props }).body;
}

function icons(html: string): readonly string[] {
  return Array.from(
    html.matchAll(/<svg[^>]*class="lucide lucide-([\w-]+)((?: [\w-]+)*)"[^>]*>/gu),
    (found) => `${found[1] ?? ''}${found[2] ?? ''}`,
  );
}

function hiddenIcons(html: string): number {
  return Array.from(html.matchAll(/<svg[^>]*aria-hidden="true"[^>]*>/gu)).length;
}

describe('the icons the base components draw', () => {
  it('draws a check and a dash after the checkbox input, both decorative', () => {
    const html = markup(Checkbox, { children: TEXT });

    expect(icons(html)).toEqual([
      'check checkbox-mark checkbox-check',
      'minus checkbox-mark checkbox-dash',
    ]);
    expect(hiddenIcons(html)).toBe(2);
    expect(html.indexOf('checkbox-input')).toBeLessThan(html.indexOf('lucide-check'));
  });

  it('draws the chevron of a select after it', () => {
    const html = markup(Select, { children: TEXT });

    expect(icons(html)).toEqual(['chevron-down select-icon']);
    expect(html.indexOf('</select>')).toBeLessThan(html.indexOf('lucide-chevron-down'));
  });

  it('draws a circled cross in a field error and nothing when the field has none', () => {
    const control = createRawSnippet(() => ({ render: () => '<input />' }));

    expect(icons(markup(Field, { label: 'Name', error: 'Required', children: control }))).toEqual([
      'circle-x field-error-icon',
    ]);
    expect(icons(markup(Field, { label: 'Name', children: control }))).toEqual([]);
  });

  it('draws the chevron at the end of an accordion trigger', () => {
    const html = markup(AccordionItem, { title: 'Question', children: TEXT });

    expect(icons(html)).toEqual(['chevron-down accordion-icon']);
    expect(html.indexOf('Question')).toBeLessThan(html.indexOf('lucide-chevron-down'));
    expect(html.indexOf('lucide-chevron-down')).toBeLessThan(html.indexOf('</summary>'));
  });

  it('draws the icon of each status variant', () => {
    for (const [variant, name] of Object.entries(STATUS_ICONS)) {
      expect(icons(markup(StatusIcon, { variant, class: 'x' }))).toEqual([`${name} x`]);
    }
  });

  it('draws the status icon of an alert and a cross in its dismiss button', () => {
    const html = markup(Alert, { variant: 'warning', ondismiss: () => undefined, children: TEXT });

    expect(icons(html)).toEqual(['triangle-alert alert-icon', 'x close-icon']);
    expect(html).toMatch(/<button[^>]*aria-label="Dismiss"[^>]*>\s*<svg/u);
  });

  it('draws the status icon of a toast and a cross in its close button', () => {
    const toaster = new Toaster();
    toaster.show({ title: 'Saved', variant: 'success' });
    const html = markup(Toast, { toast: toaster.toasts[0], toaster, dismissLabel: 'Close' });

    expect(icons(html)).toEqual(['circle-check toast-icon', 'x close-icon']);
  });

  it('draws a cross in the close button of a titled modal', () => {
    expect(icons(markup(Modal, { title: 'Settings', children: TEXT }))).toEqual(['x close-icon']);
  });

  it('draws the mark of each file state and a cross in the remove button', () => {
    const base = { id: 'a', name: 'a.pdf', size: 1 } as const;
    const items: readonly [FileItemData, string][] = [
      [{ ...base, state: 'pending' }, 'file'],
      [{ ...base, state: 'uploading', progress: 10 }, 'file'],
      [{ ...base, state: 'complete' }, 'circle-check'],
      [{ ...base, state: 'error', message: 'Too big' }, 'circle-x'],
    ];

    for (const [item, name] of items) {
      expect(icons(markup(FileItem, { item, onremove: () => undefined }))).toEqual([
        `${name} file-item-mark`,
        'x close-icon',
      ]);
    }
  });

  it('draws a cross in the remove button of a removable tag only', () => {
    expect(
      icons(markup(Tag, { onremove: () => undefined, removeLabel: 'Remove', children: TEXT })),
    ).toEqual(['x tag-remove-icon']);
    expect(icons(markup(Tag, { children: TEXT }))).toEqual([]);
  });

  it('draws a chevron after the content of a dropdown trigger', () => {
    const html = markup(Dropdown, { trigger: TEXT, children: TEXT });

    expect(icons(html)).toEqual(['chevron-down dropdown-icon']);
    expect(html.indexOf('<span>Label</span>')).toBeLessThan(html.indexOf('lucide-chevron-down'));
  });

  it('draws a left chevron before Previous and a right chevron after Next', () => {
    const html = markup(Pagination, { total: 3, page: 2 });

    expect(icons(html)).toEqual(['chevron-left pagination-icon', 'chevron-right pagination-icon']);
    expect(html.indexOf('lucide-chevron-left')).toBeLessThan(html.indexOf('Previous'));
    expect(html.indexOf('Next')).toBeLessThan(html.indexOf('lucide-chevron-right'));
  });

  it('draws a chevron in every breadcrumb separator', () => {
    const items = [
      { label: 'Home', href: '/' },
      { label: 'Settings', href: '/s' },
      { label: 'Storage' },
    ];

    expect(icons(markup(Breadcrumb, { items }))).toEqual([
      'chevron-right breadcrumb-icon',
      'chevron-right breadcrumb-icon',
    ]);
  });

  it('draws the upload arrow in the dropzone icon box', () => {
    const html = markup(Dropzone, { onfiles: () => undefined });

    expect(icons(html)).toEqual(['upload dropzone-mark']);
    expect(html).toMatch(/<span class="dropzone-icon"[^>]*><svg/u);
  });
});
