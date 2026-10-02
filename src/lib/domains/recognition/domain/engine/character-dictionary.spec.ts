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

  it('stops at the end of the list rather than swallowing what follows it', () => {
    expect(characterDictionary(`${CONFIG}\n  - Z`)).toEqual(['가', '!', "'", 'A']);
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
});
