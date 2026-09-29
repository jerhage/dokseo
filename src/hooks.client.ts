import { ensureDisposableStack } from '$lib/platform/polyfill/disposable-stack';
import { ensureDispose } from '$lib/platform/polyfill/symbol-dispose';

const dispose = ensureDispose(Symbol);

ensureDisposableStack(globalThis, dispose);
