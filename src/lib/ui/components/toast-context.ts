import { getContext, setContext } from 'svelte';
import type { Toaster } from './toaster.svelte';

const TOASTER = Symbol('toaster');

function setToaster(toaster: Toaster): void {
  setContext(TOASTER, toaster);
}

function findToaster(): Toaster | undefined {
  return getContext<Toaster | undefined>(TOASTER);
}

function getToaster(): Toaster {
  const toaster = findToaster();
  if (toaster === undefined) {
    throw new Error('No toaster in context. Call setToaster() in an ancestor first.');
  }
  return toaster;
}

export { TOASTER, findToaster, getToaster, setToaster };
