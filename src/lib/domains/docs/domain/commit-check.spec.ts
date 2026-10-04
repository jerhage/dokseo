import { describe, expect, it } from 'vitest';
import { checkCommit, commitEffect, problemText } from './commit-check';
import type { CommitCheck, CommitProblem } from './commit-check';
import { DOKSEO_BUMP_OPTIONS, DOKSEO_CHANGELOG_SECTIONS } from './dokseo-release';
import { formatVersion, parseVersion } from './release-bump';

function problems(check: CommitCheck): readonly string[] {
  return check.kind === 'rejected' ? check.problems.map((problem) => problem.kind) : [];
}

describe('checkCommit', () => {
  it('accepts a scoped feat and reports no break', () => {
    const check = checkCommit('feat(export): import a captures file');

    expect(check.kind).toBe('accepted');
    expect(check.kind === 'accepted' && check.breaking).toBe(false);
  });

  it('accepts a breaking footer after a blank line and reports the break', () => {
    const check = checkCommit('fix(storage): new record\n\nBREAKING CHANGE: export, then import');

    expect(check.kind === 'accepted' && check.breaking).toBe(true);
  });

  it.each([
    ['', 'empty'],
    ['update the reader', 'no-colon'],
    ['feat:no space', 'no-space'],
    ['feat (export): spaced', 'bad-prefix'],
    ['fix: ', 'no-description'],
    ['Feat: shout', 'type-case'],
    ['feature: x', 'type-not-allowed'],
    ['revert: undo', 'type-not-allowed'],
  ])('rejects %j as %s', (message, kind) => {
    expect(problems(checkCommit(message))).toEqual([kind]);
  });

  it('rejects a body that starts on the second line', () => {
    expect(problems(checkCommit('fix: x\nmore'))).toEqual(['no-blank-line']);
  });

  it('rejects a breaking footer written in lower case or without a description', () => {
    expect(problems(checkCommit('feat: x\n\nbreaking change: y'))).toEqual([
      'breaking-footer-format',
    ]);
    expect(problems(checkCommit('feat: x\n\nBREAKING CHANGE:'))).toEqual([
      'breaking-footer-format',
    ]);
  });

  it('rejects a Release-As footer with no version', () => {
    expect(problems(checkCommit('chore: release\n\nRelease-As: one'))).toEqual([
      'release-as-not-a-version',
    ]);
  });
});

describe('commitEffect', () => {
  it('gives a feat the next patch before 1.0 and the next minor after', () => {
    const effect = (from: string) => {
      const version = parseVersion(from);
      if (version === null) throw new Error(from);
      const { release } = commitEffect(
        'feat: x',
        version,
        DOKSEO_BUMP_OPTIONS,
        DOKSEO_CHANGELOG_SECTIONS,
      );
      return release.kind === 'release' ? formatVersion(release.version) : release.kind;
    };

    expect(effect('0.9.4')).toBe('0.9.5');
    expect(effect('1.2.0')).toBe('1.3.0');
  });
});

describe('problemText', () => {
  it('names the allowed types for a type that is not allowed', () => {
    const problem: CommitProblem = { kind: 'type-not-allowed', type: 'wip' };

    expect(problemText(problem)).toContain('chore, feat, fix, docs, refactor, test, perf, style');
  });
});
