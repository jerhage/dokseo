import { describe, expect, it } from 'vitest';
import type { Version } from '../../../domain/release-bump';
import { releaseHeadline } from './release-text';

const version: Version = { major: 0, minor: 9, patch: 5, preRelease: null, build: null };

describe('releaseHeadline', () => {
  it('names the version and the rule that chose it', () => {
    const headline = releaseHeadline({
      kind: 'release',
      version,
      reason: { kind: 'feature', update: 'patch' },
      changelog: { breaking: [], groups: [] },
    });

    expect(headline).toBe('0.9.5: a feat bumps the patch.');
  });

  it('says why a hidden-only list opens no release', () => {
    const headline = releaseHeadline({
      kind: 'nothing-to-release',
      version,
      reason: { kind: 'other', update: 'patch' },
    });

    expect(headline).toContain('nothing in these commits belongs');
  });

  it('reports an unreadable Release-As value', () => {
    expect(releaseHeadline({ kind: 'bad-release-as', text: 'soon' })).toBe(
      'Release-As: soon is not a version. Version.parse throws, and the action run fails.',
    );
  });
});
