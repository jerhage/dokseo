import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { DEFAULT_READING_SETTINGS } from '../domain/reading-settings';
import FlowSettingsDialog from './FlowSettingsDialog.svelte';

function panel(container: HTMLElement): HTMLDialogElement {
  const dialog = container.querySelector('dialog');
  if (dialog === null) throw new Error('The text settings rendered no dialog');
  return dialog;
}

function legendsIn(dialog: HTMLDialogElement): readonly string[] {
  return [...dialog.querySelectorAll('legend')].map((legend) => legend.textContent ?? '');
}

function readingsSwitch(dialog: HTMLDialogElement): HTMLInputElement {
  const box = dialog.querySelector<HTMLInputElement>('input[type="checkbox"]');
  if (box === null) throw new Error('The text settings rendered no readings switch');
  return box;
}

test('opens for a book of any language, because it asks about none', async () => {
  const { container } = await render(FlowSettingsDialog, {
    props: {
      settings: DEFAULT_READING_SETTINGS,
      onchoose: vi.fn(),
      onclose: vi.fn(),
    },
  });

  expect(panel(container).open).toBe(true);
});

test('offers the readings beside the two scales, whatever the book', async () => {
  const { container } = await render(FlowSettingsDialog, {
    props: {
      settings: DEFAULT_READING_SETTINGS,
      onchoose: vi.fn(),
      onclose: vi.fn(),
    },
  });

  expect(legendsIn(panel(container))).toEqual(['Text size', 'Line spacing', 'Furigana']);
  expect(readingsSwitch(panel(container)).checked).toBe(true);
});

test('reports the readings turned off when the switch is unticked', async () => {
  const onchoose = vi.fn();
  const { container } = await render(FlowSettingsDialog, {
    props: {
      settings: DEFAULT_READING_SETTINGS,
      onchoose,
      onclose: vi.fn(),
    },
  });

  const box = readingsSwitch(panel(container));
  box.click();

  expect(onchoose).toHaveBeenCalledWith({
    ...DEFAULT_READING_SETTINGS,
    showPhoneticReadings: false,
  });
});
