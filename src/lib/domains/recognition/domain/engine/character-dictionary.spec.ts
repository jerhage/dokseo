import { describe, expect, it } from 'vitest';
import { characterDictionary, ctcLabels } from './character-dictionary';

const CONFIG = [
  'PostProcess:',
  '  name: CTCLabelDecode',
  '  character_dict:',
  '  - 가',
  "  - '!'",
  "  - ''''",
  '  - A',
  'Global:',
  '  model_name: a-recogniser',
].join('\n');

describe('characterDictionary', () => {
  it('reads every entry in the order the decoder indexes them', () => {
    expect(characterDictionary(CONFIG)).toEqual(['가', '!', "'", 'A']);
  });

  it('unwraps a quoted entry, so punctuation is one character and not three', () => {
    expect(characterDictionary(CONFIG)[1]).toBe('!');
  });

  it('reads a doubled quote as the one apostrophe it escapes', () => {
    expect(characterDictionary(CONFIG)[2]).toBe("'");
  });

  it('stops at the end of the list rather than swallowing what follows it', () => {
    expect(characterDictionary(CONFIG)).not.toContain('Global:');
  });

  it('reads a list written with carriage returns', () => {
    expect(characterDictionary(CONFIG.replaceAll('\n', '\r\n'))).toEqual(['가', '!', "'", 'A']);
  });

  it('reads nothing from a file that declares no character list', () => {
    expect(characterDictionary('PostProcess:\n  name: CTCLabelDecode\n')).toEqual([]);
  });
});

describe('ctcLabels', () => {
  it('puts the blank first and the space last, where the decoder expects them', () => {
    expect(ctcLabels(['가', 'A'])).toEqual(['', '가', 'A', ' ']);
  });

  it('indexes every dictionary entry one above its own position', () => {
    const entries = characterDictionary(CONFIG);
    const labels = ctcLabels(entries);

    expect(labels.length).toBe(entries.length + 2);
    expect(labels[1]).toBe(entries[0]);
  });
});
