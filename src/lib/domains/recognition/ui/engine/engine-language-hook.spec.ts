import { describe, expect, it, vi } from 'vitest';
import { createEngineLanguage } from './engine-language.svelte';

describe('createEngineLanguage', () => {
  it('starts on the first language a model can read', () => {
    expect(createEngineLanguage(() => undefined).language).toBe('ja');
  });

  it('tells its owner once when another language is chosen, and not when the same one is', () => {
    const changed = vi.fn();
    const choice = createEngineLanguage(changed);

    choice.choose('ja');
    expect(changed).not.toHaveBeenCalled();

    choice.choose('ko');
    expect(choice.language).toBe('ko');
    expect(changed).toHaveBeenCalledTimes(1);
  });
});
