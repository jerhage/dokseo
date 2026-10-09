import { describe, expect, it } from 'vitest';
import { engineLanguages, firstEngineLanguage } from './engine-setup';

describe('engineLanguages', () => {
  it('offers every language a model can read', () => {
    expect(engineLanguages()).toEqual(['ja', 'ko', 'en']);
  });
});

describe('firstEngineLanguage', () => {
  it('starts on the first language a model can read', () => {
    expect(firstEngineLanguage()).toBe('ja');
  });
});
