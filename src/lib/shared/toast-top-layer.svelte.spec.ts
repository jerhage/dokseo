import { afterEach, expect, test } from 'vitest';
import { cleanup, render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import '$lib/ui/core/styles/index.css';
import Modal from '$lib/ui/components/Modal.svelte';
import { TOASTER } from '$lib/ui/components/toast-context';
import ToastRegion from '$lib/ui/components/ToastRegion.svelte';
import { createToaster } from '$lib/ui/components/toaster.svelte';
import type { Toaster } from '$lib/ui/components/toaster.svelte';

afterEach(() => {
  cleanup();
});

function hitsItself(element: Element): boolean {
  const box = element.getBoundingClientRect();
  const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
  return hit !== null && element.contains(hit);
}

function closeButton(title: string): Element {
  const toast = [...document.querySelectorAll('.toast')].find(
    (candidate) => candidate.querySelector('.toast-title')?.textContent === title,
  );
  const button = toast?.querySelector('.toast-close');
  if (button === null || button === undefined) throw new Error(`No toast titled ${title}`);
  return button;
}

async function openModal(toaster: Toaster): Promise<void> {
  await render(Modal, {
    props: { open: true, title: 'Settings' },
    context: new Map([[TOASTER, toaster]]),
  });
  await expect.poll(() => document.querySelector('dialog:modal')).not.toBeNull();
}

test('keeps a toast shown before a modal opened above the modal and clickable', async () => {
  const toaster = createToaster();
  await render(ToastRegion, { props: { toaster } });
  toaster.show({ title: 'Saved', duration: 'persistent' });

  await openModal(toaster);

  await expect.poll(() => hitsItself(closeButton('Saved'))).toBe(true);
});

test('runs the action of a toast shown while a modal is open', async () => {
  const toaster = createToaster();
  await render(ToastRegion, { props: { toaster } });
  await openModal(toaster);
  let undone = 0;

  toaster.show({ title: 'Removed', action: { label: 'Undo', run: () => (undone += 1) } });
  await page.getByRole('button', { name: 'Undo' }).click();

  expect(undone).toBe(1);
});
