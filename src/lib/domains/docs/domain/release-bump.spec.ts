import { describe, expect, it } from 'vitest';
import { conventionalCommits } from './conventional-commit';
import type { ConventionalCommit } from './conventional-commit';
import {
  DOKSEO_BUMP_OPTIONS,
  DOKSEO_CHANGELOG_SECTIONS,
  RELEASE_PLEASE_DEFAULTS,
} from './dokseo-release';
import {
  buildChangelog,
  changelogMarkdown,
  formatVersion,
  nextRelease,
  parseVersion,
} from './release-bump';
import type { NextRelease, Version } from './release-bump';

function version(text: string): Version {
  const parsed = parseVersion(text);
  if (parsed === null) throw new Error(`not a version: ${text}`);
  return parsed;
}

function commits(...messages: string[]): readonly ConventionalCommit[] {
  return messages.flatMap(conventionalCommits);
}

function released(release: NextRelease): string {
  if (release.kind !== 'release') return release.kind;
  return formatVersion(release.version);
}

function dokseo(from: string, ...messages: string[]): NextRelease {
  return nextRelease(
    version(from),
    commits(...messages),
    DOKSEO_BUMP_OPTIONS,
    DOKSEO_CHANGELOG_SECTIONS,
  );
}

describe('nextRelease, after DefaultVersioningStrategy.determineReleaseType in release-please src/versioning-strategies/default.ts', () => {
  it('bumps the patch for a feat before 1.0 under bump-patch-for-minor-pre-major', () => {
    expect(released(dokseo('0.9.3', 'feat(export): import a file'))).toBe('0.9.4');
  });

  it('bumps the minor for a breaking change before 1.0 under bump-minor-pre-major', () => {
    expect(released(dokseo('0.9.4', 'feat!: a new stored format', 'fix: a typo'))).toBe('0.10.0');
  });

  it('bumps the minor for a feat and the major for a breaking change from 1.0 on', () => {
    expect(released(dokseo('1.2.3', 'feat: tags'))).toBe('1.3.0');
    expect(released(dokseo('1.2.3', 'fix!: links change'))).toBe('2.0.0');
  });

  it('bumps the minor for a feat before 1.0 with the release-please defaults', () => {
    const release = nextRelease(
      version('0.9.3'),
      commits('feat: x'),
      RELEASE_PLEASE_DEFAULTS,
      DOKSEO_CHANGELOG_SECTIONS,
    );

    expect(released(release)).toBe('0.10.0');
  });

  it('bumps the major for a breaking change before 1.0 with the release-please defaults', () => {
    const release = nextRelease(
      version('0.9.3'),
      commits('feat!: x'),
      RELEASE_PLEASE_DEFAULTS,
      DOKSEO_CHANGELOG_SECTIONS,
    );

    expect(released(release)).toBe('1.0.0');
  });

  it('bumps the patch for fix and perf alone', () => {
    expect(released(dokseo('1.0.0', 'perf: faster pages'))).toBe('1.0.1');
  });

  it('counts a breaking change of a hidden type', () => {
    expect(released(dokseo('1.4.2', 'refactor!: drop the v1 store'))).toBe('2.0.0');
  });

  it('counts the type feature as a feature, compared exactly', () => {
    const feature = dokseo('1.0.0', 'fix: a', 'feature: b');
    const capital = dokseo('1.0.0', 'fix: a', 'Feat: b');

    expect(released(feature)).toBe('1.1.0');
    expect(released(capital)).toBe('1.0.1');
  });
});

describe('nextRelease, after BaseStrategy.buildNewVersion and buildReleasePullRequest in release-please src/strategies/base.ts', () => {
  it('reports no commits for an empty list', () => {
    expect(dokseo('0.9.4').kind).toBe('no-commits');
  });

  it('opens no release when every commit is of a hidden type', () => {
    const release = dokseo('0.9.4', 'refactor: split a file', 'docs: a note', 'ci: pin deno');

    expect(release.kind).toBe('nothing-to-release');
  });

  it('takes the version from the newest Release-As footer, whatever the other commits say', () => {
    const release = dokseo(
      '0.9.4',
      'chore: release 1.0.0\n\nRelease-As: 1.0.0',
      'feat!: something breaking',
      'chore: earlier\n\nRelease-As: 0.9.9',
    );

    expect(released(release)).toBe('1.0.0');
  });

  it('shows a Release-As chore in the changelog under its hidden section', () => {
    const release = dokseo('0.9.4', 'chore: release 1.0.0\n\nRelease-As: 1.0.0');

    expect(release.kind === 'release' && release.changelog.groups).toEqual([
      { title: 'Chores', entries: [{ scope: null, text: 'release 1.0.0' }] },
    ]);
  });

  it('reports a Release-As value that is not a version', () => {
    expect(dokseo('0.9.4', 'chore: go\n\nRelease-As: soon')).toEqual({
      kind: 'bad-release-as',
      text: 'soon',
    });
  });
});

describe('buildChangelog, after the conventionalcommits preset writer options with release-please DefaultChangelogNotes', () => {
  it('groups visible types in the configured section order and leaves hidden types out', () => {
    const changelog = buildChangelog(
      commits('perf: decode once', 'test: cover it', 'fix(reader): a tap', 'feat(export): a file'),
      DOKSEO_CHANGELOG_SECTIONS,
    );

    expect(changelog.groups.map((group) => group.title)).toEqual([
      'Features',
      'Fixes',
      'Performance',
    ]);
    expect(changelog.breaking).toEqual([]);
  });

  it('lists every breaking note, and keeps a breaking hidden commit under its section', () => {
    const changelog = buildChangelog(
      commits('refactor(storage)!: books need a reload'),
      DOKSEO_CHANGELOG_SECTIONS,
    );

    expect(changelog).toEqual({
      breaking: [{ scope: 'storage', text: 'books need a reload' }],
      groups: [
        { title: 'Refactoring', entries: [{ scope: 'storage', text: 'books need a reload' }] },
      ],
    });
  });

  it('drops a type that no section names unless it is breaking', () => {
    const changelog = buildChangelog(
      commits('revert: undo', 'wip!: half done'),
      DOKSEO_CHANGELOG_SECTIONS,
    );

    expect(changelog.groups).toEqual([
      { title: 'wip', entries: [{ scope: null, text: 'half done' }] },
    ]);
  });
});

describe('changelogMarkdown, after the conventionalcommits preset templates', () => {
  it('writes the breaking notes first, then each section, with the scope in bold', () => {
    const changelog = buildChangelog(
      commits('fix: a tap', 'feat(export)!: a new file format'),
      DOKSEO_CHANGELOG_SECTIONS,
    );

    expect(changelogMarkdown(version('0.10.0'), changelog)).toBe(
      [
        '## 0.10.0',
        '### ⚠ BREAKING CHANGES',
        '* **export:** a new file format',
        '### Features',
        '* **export:** a new file format',
        '### Fixes',
        '* a tap',
      ].join('\n\n'),
    );
  });
});

describe('parseVersion, after Version.parse in release-please src/version.ts', () => {
  it('keeps a pre-release and build, and a bump keeps them too', () => {
    expect(formatVersion(version('1.0.0-beta.1+abc'))).toBe('1.0.0-beta.1+abc');
    expect(released(dokseo('1.0.0-beta.1', 'fix: x'))).toBe('1.0.1-beta.1');
  });

  it('rejects text with no version in it', () => {
    expect(parseVersion('one')).toBeNull();
  });
});
