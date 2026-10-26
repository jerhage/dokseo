import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isChange } from '$lib/domains/sync/domain/change';

const EXAMPLES = new URL('../../../../../contracts/dokseo-sync/examples/', import.meta.url);

const DATA_RULE_ONLY = new Set([
  'book-record-id-uppercase.json',
  'capture-record-id-not-uuid.json',
  'data-does-not-match-kind.json',
]);

function readExamples(folder: string): { name: string; value: unknown }[] {
  const dir = new URL(`${folder}/change/`, EXAMPLES);
  return readdirSync(dir).map((name) => ({
    name,
    value: JSON.parse(readFileSync(new URL(name, dir), 'utf8')),
  }));
}

describe('isChange', () => {
  it('accepts every valid contract example and keeps its kind', () => {
    for (const { name, value } of readExamples('valid')) {
      expect(isChange(value), name).toBe(true);
      if (isChange(value))
        expect(name.replace('.json', '') === value.kind || name === 'tombstone.json', name).toBe(
          true,
        );
    }
  });

  it('rejects every invalid contract example that breaks the envelope', () => {
    const envelopeBreaks = readExamples('invalid').filter(({ name }) => !DATA_RULE_ONLY.has(name));
    expect(envelopeBreaks.length).toBeGreaterThan(0);
    for (const { name, value } of envelopeBreaks) expect(isChange(value), name).toBe(false);
  });
});
