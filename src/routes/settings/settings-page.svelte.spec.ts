import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import type { Container } from '$lib/container';
import { TOASTER } from '$lib/components/toast-context';
import { createToaster } from '$lib/components/toaster.svelte';
import type { Language } from '$lib/shared/language';
import WithQueryClient from '$lib/shared/testing/WithQueryClient.svelte';
import SettingsPage from './+page.svelte';

const calls = vi.hoisted(() => ({ setups: [] as string[], probes: 0 }));

function unused(): never {
  throw new Error('The engine settings route does not use this');
}

vi.mock('$lib/context', () => ({
  provideContainer: unused,
  useContainer: () =>
    ({
      recognition: {
        readRecognizerSetup: (language: Language) => {
          calls.setups.push(language);
          return Promise.resolve({ kind: 'success', choice: { model: null, compute: 'auto' } });
        },
        detectCompute: () => {
          calls.probes += 1;
          return Promise.resolve({ available: false, description: null });
        },
        readModelStorage: () => new Promise(() => undefined),
      },
    }) as unknown as Container,
}));

afterEach(() => {
  cleanup();
  calls.setups = [];
  calls.probes = 0;
});

async function mounted(): Promise<void> {
  await render(WithQueryClient, {
    props: { screen: SettingsPage },
    context: new Map([[TOASTER, createToaster()]]),
  });
  await expect.poll(() => calls.probes).toBeGreaterThan(0);
  await new Promise((settle) => setTimeout(settle, 50));
}

test('reads the recognizer setup and probes the compute once when the route mounts', async () => {
  await mounted();

  expect({ setups: calls.setups, probes: calls.probes }).toEqual({ setups: ['ja'], probes: 1 });
});

test('reads the setup of a chosen language once and keeps the compute it probed', async () => {
  await mounted();
  calls.setups = [];
  calls.probes = 0;

  await page.getByRole('button', { name: 'Korean' }).click();
  await expect.poll(() => calls.setups.length).toBeGreaterThan(0);
  await new Promise((settle) => setTimeout(settle, 50));

  expect({ setups: calls.setups, probes: calls.probes }).toEqual({ setups: ['ko'], probes: 0 });
});
