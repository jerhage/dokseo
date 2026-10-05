import { describe, expect, it } from 'vitest';
import { IME_PROCESS_KEY_CODE, isComposingKey } from './composing-key';

describe('isComposingKey', () => {
  it('reports a press the browser marks as composing', () => {
    expect(isComposingKey({ isComposing: true, keyCode: 13 })).toBe(true);
  });

  it('reports the IME process key code that Safari sends after the composition ends', () => {
    expect(isComposingKey({ isComposing: false, keyCode: IME_PROCESS_KEY_CODE })).toBe(true);
    expect(IME_PROCESS_KEY_CODE).toBe(229);
  });

  it('passes a plain press with neither signal', () => {
    expect(isComposingKey({ isComposing: false, keyCode: 13 })).toBe(false);
    expect(isComposingKey({ isComposing: false, keyCode: 0 })).toBe(false);
  });
});
