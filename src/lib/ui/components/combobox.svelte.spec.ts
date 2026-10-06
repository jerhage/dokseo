import '../core/styles/index.css';
import { flushSync, mount, tick, unmount } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import Combobox from './Combobox.svelte';
import type { ComboboxOption } from './combobox';
import { overlaySpacing } from './overlay-placement';

type Subject = {
  readonly host: HTMLElement;
  readonly field: HTMLInputElement;
  readonly listbox: HTMLElement;
  readonly mounted: ReturnType<typeof mount>;
};

const LANGUAGES: readonly ComboboxOption[] = [
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'es', label: 'Spanish' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ru', label: 'Russian' },
];

let subject: Subject | null = null;

async function settle(listbox: HTMLElement): Promise<void> {
  flushSync();
  await tick();
  for (const animation of listbox.getAnimations()) animation.finish();
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await new Promise((resolve) => requestAnimationFrame(resolve));
  flushSync();
}

function mountNearBottom(): Subject {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.insetInline = '16px';
  host.style.bottom = '16px';
  document.body.append(host);
  const mounted = mount(Combobox, {
    target: host,
    props: { label: 'Language', options: LANGUAGES },
  });
  flushSync();
  const field = host.querySelector('input');
  const listbox = host.querySelector<HTMLElement>('[role="listbox"]');
  if (field === null || listbox === null) throw new Error('The combobox rendered no field');
  return { host, field, listbox, mounted };
}

function gapAboveField(field: HTMLElement, listbox: HTMLElement): number {
  return field.getBoundingClientRect().top - listbox.getBoundingClientRect().bottom;
}

afterEach(() => {
  if (subject === null) return;
  unmount(subject.mounted);
  subject.host.remove();
  subject = null;
});

describe('Combobox placement', () => {
  it('keeps a list above the field one gap above it as typing shrinks and regrows the list', async () => {
    subject = mountNearBottom();
    const { field, listbox } = subject;
    const { gap } = overlaySpacing(getComputedStyle(listbox));

    await userEvent.click(field);
    await userEvent.keyboard('{ArrowDown}');
    await settle(listbox);
    const fullHeight = listbox.offsetHeight;
    expect(gapAboveField(field, listbox)).toBeCloseTo(gap, 0);

    await userEvent.keyboard('k');
    await settle(listbox);
    expect(listbox.querySelectorAll('[role="option"]')).toHaveLength(1);
    expect(listbox.offsetHeight).toBeLessThan(fullHeight);
    expect(gapAboveField(field, listbox)).toBeCloseTo(gap, 0);

    await userEvent.keyboard('{Backspace}');
    await settle(listbox);
    expect(listbox.offsetHeight).toBe(fullHeight);
    expect(gapAboveField(field, listbox)).toBeCloseTo(gap, 0);
  });
});
