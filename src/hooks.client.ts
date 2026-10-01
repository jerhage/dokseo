import type { HandleClientError } from '@sveltejs/kit';
import { ensureDisposableStack } from '$lib/platform/polyfill/disposable-stack';
import { ensureDispose } from '$lib/platform/polyfill/symbol-dispose';
import { logUnexpected } from '$lib/shared/unexpected-failure';

const dispose = ensureDispose(Symbol);

ensureDisposableStack(globalThis, dispose);

const handleError: HandleClientError = ({ error }) => {
  logUnexpected('navigation', error);
};

export { handleError };
