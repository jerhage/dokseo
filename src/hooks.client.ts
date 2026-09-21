import { ensureDispose } from '$lib/platform/polyfill/symbol-dispose';
import type { DisposeOwner } from '$lib/platform/polyfill/symbol-dispose';

ensureDispose(Symbol as unknown as DisposeOwner);
