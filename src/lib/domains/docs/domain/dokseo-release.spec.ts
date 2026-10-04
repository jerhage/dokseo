import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DOKSEO_BUMP_OPTIONS,
  DOKSEO_CHANGELOG_SECTIONS,
  DOKSEO_COMMIT_TYPES,
  isDokseoCommitType,
} from './dokseo-release';

type ReleasePleaseConfig = {
  'bump-minor-pre-major': boolean;
  'bump-patch-for-minor-pre-major': boolean;
  'changelog-sections': { type: string; section: string; hidden?: boolean }[];
};

const config: ReleasePleaseConfig = JSON.parse(readFileSync('release-please-config.json', 'utf8'));

describe('the Dokseo release settings the docs demos use', () => {
  it('matches the bump options in release-please-config.json', () => {
    expect(DOKSEO_BUMP_OPTIONS).toEqual({
      bumpMinorPreMajor: config['bump-minor-pre-major'],
      bumpPatchForMinorPreMajor: config['bump-patch-for-minor-pre-major'],
    });
  });

  it('matches the changelog sections in release-please-config.json', () => {
    expect(DOKSEO_CHANGELOG_SECTIONS).toEqual(config['changelog-sections']);
  });

  it('gives every allowed commit type a changelog section', () => {
    expect(config['changelog-sections'].map((section) => section.type).toSorted()).toEqual(
      [...DOKSEO_COMMIT_TYPES].toSorted(),
    );
  });

  it('accepts only the lower-case allowed types', () => {
    expect(isDokseoCommitType('perf')).toBe(true);
    expect(isDokseoCommitType('Perf')).toBe(false);
    expect(isDokseoCommitType('revert')).toBe(false);
  });
});
