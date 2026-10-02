import { getContext, setContext } from 'svelte';
import type { ShellUpdates } from './shell-updates';

const SHELL_UPDATES = Symbol('shell-updates');

function provideShellUpdates(updates: ShellUpdates): void {
  setContext(SHELL_UPDATES, updates);
}

function useShellUpdates(): ShellUpdates {
  const updates = getContext<ShellUpdates | undefined>(SHELL_UPDATES);
  if (updates === undefined) {
    throw new Error('No shell updates in context. Call provideShellUpdates() in the root layout.');
  }
  return updates;
}

export { SHELL_UPDATES, provideShellUpdates, useShellUpdates };
