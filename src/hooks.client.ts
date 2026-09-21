import { ensureDisposableStack } from '$lib/platform/polyfill/disposable-stack';
import type { StackOwner } from '$lib/platform/polyfill/disposable-stack';
import { ensureDispose } from '$lib/platform/polyfill/symbol-dispose';
import type { DisposeOwner } from '$lib/platform/polyfill/symbol-dispose';

ensureDispose(Symbol as unknown as DisposeOwner);
ensureDisposableStack(globalThis as StackOwner);
