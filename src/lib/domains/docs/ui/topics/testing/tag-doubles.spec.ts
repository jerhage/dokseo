import { describe, expect, it } from 'vitest';
import { createTag } from '$lib/domains/recognition/use-cases/tag/create-tag';
import { CREATE_VERSIONS, isCreateVersion, runDoubleTests, versionOf } from './tag-doubles';
import type { CreateVersion } from './tag-doubles';

async function verdicts(version: CreateVersion): Promise<readonly string[]> {
  const tests = await runDoubleTests(version);
  return tests.map((test) => `${test.double}: ${test.outcome.kind}`);
}

describe('runDoubleTests', () => {
  it('runs the real createTag as the first version', () => {
    expect(versionOf('real')).toBe(createTag);
    expect(CREATE_VERSIONS[0]?.value).toBe('real');
  });

  it('passes all four tests on the real createTag', async () => {
    expect(await verdicts('real')).toEqual([
      'fake: passed',
      'fake: passed',
      'mock: passed',
      'mock: passed',
    ]);
  });

  it('fails only the call-counting mock test on a refactor that lists twice', async () => {
    expect(await verdicts('lists-twice')).toEqual([
      'fake: passed',
      'fake: passed',
      'mock: failed',
      'mock: passed',
    ]);
  });

  it('fails one fake test and one mock test on a case-sensitive name check', async () => {
    expect(await verdicts('case-sensitive')).toEqual([
      'fake: passed',
      'fake: failed',
      'mock: passed',
      'mock: failed',
    ]);
  });

  it('records the calls each double received', async () => {
    const [, , counted] = await runDoubleTests('lists-twice');

    expect(counted?.calls).toEqual(['list()', 'list()', 'save(Grammar)']);
  });

  it('accepts only the versions it offers', () => {
    expect(isCreateVersion('lists-twice')).toBe(true);
    expect(isCreateVersion('lists-thrice')).toBe(false);
  });
});
