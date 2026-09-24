import { getContext, setContext } from 'svelte';
import type { Toaster } from './toaster.svelte';

const TOASTER = Symbol('toaster');

function setToaster(toaster: Toaster): void {
  setContext(TOASTER, toaster);
}

function getToaster(): Toaster {
  const toaster = getContext<Toaster | undefined>(TOASTER);
  if (toaster === undefined) {
    throw new Error('No toaster in context. Call setToaster() in an ancestor first.');
  }
  return toaster;
}

export { getToaster, setToaster };
