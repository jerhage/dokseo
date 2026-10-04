import { match } from 'ts-pattern';
import type { ConventionalCommit } from './conventional-commit';

type Version = {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly preRelease: string | null;
  readonly build: string | null;
};

type BumpOptions = {
  readonly bumpMinorPreMajor: boolean;
  readonly bumpPatchForMinorPreMajor: boolean;
};

type ChangelogSection = {
  readonly type: string;
  readonly section: string;
  readonly hidden?: boolean;
};

type ChangelogEntry = {
  readonly scope: string | null;
  readonly text: string;
};

type ChangelogGroup = {
  readonly title: string;
  readonly entries: readonly ChangelogEntry[];
};

type Changelog = {
  readonly breaking: readonly ChangelogEntry[];
  readonly groups: readonly ChangelogGroup[];
};

type VersionUpdate = 'major' | 'minor' | 'patch';

type BumpReason =
  | { readonly kind: 'release-as'; readonly text: string }
  | { readonly kind: 'breaking'; readonly update: VersionUpdate }
  | { readonly kind: 'feature'; readonly update: VersionUpdate }
  | { readonly kind: 'other'; readonly update: VersionUpdate };

type NextRelease =
  | { readonly kind: 'no-commits' }
  | { readonly kind: 'bad-release-as'; readonly text: string }
  | { readonly kind: 'nothing-to-release'; readonly version: Version; readonly reason: BumpReason }
  | {
      readonly kind: 'release';
      readonly version: Version;
      readonly reason: BumpReason;
      readonly changelog: Changelog;
    };

const VERSION = /(\d+)\.(\d+)\.(\d+)(?:-([^+]+))?(?:\+(.*))?/u;

function parseVersion(text: string): Version | null {
  const found = VERSION.exec(text);
  if (found === null) return null;

  const [, major = '0', minor = '0', patch = '0', preRelease, build] = found;
  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    preRelease: preRelease ?? null,
    build: build ?? null,
  };
}

function formatVersion(version: Version): string {
  const preRelease = version.preRelease === null ? '' : `-${version.preRelease}`;
  const build = version.build === null ? '' : `+${version.build}`;
  return `${version.major}.${version.minor}.${version.patch}${preRelease}${build}`;
}

function isPreMajor(version: Version): boolean {
  return version.major < 1;
}

function applyUpdate(version: Version, update: VersionUpdate): Version {
  return match(update)
    .with('major', () => ({ ...version, major: version.major + 1, minor: 0, patch: 0 }))
    .with('minor', () => ({ ...version, minor: version.minor + 1, patch: 0 }))
    .with('patch', () => ({ ...version, patch: version.patch + 1 }))
    .exhaustive();
}

function releaseType(
  version: Version,
  commits: readonly ConventionalCommit[],
  options: BumpOptions,
): BumpReason {
  let breaking = 0;
  let features = 0;
  for (const commit of commits) {
    if (commit.releaseAs !== null) return { kind: 'release-as', text: commit.releaseAs };
    if (commit.breakingNote !== null) breaking++;
    else if (commit.type === 'feat' || commit.type === 'feature') features++;
  }

  if (breaking > 0)
    return {
      kind: 'breaking',
      update: isPreMajor(version) && options.bumpMinorPreMajor ? 'minor' : 'major',
    };
  if (features > 0)
    return {
      kind: 'feature',
      update: isPreMajor(version) && options.bumpPatchForMinorPreMajor ? 'patch' : 'minor',
    };
  return { kind: 'other', update: 'patch' };
}

function sectionFor(
  commit: ConventionalCommit,
  sections: readonly ChangelogSection[],
): ChangelogSection | undefined {
  const type = commit.type.toLowerCase();
  return sections.find((section) => section.type === type);
}

function shownUnder(
  commit: ConventionalCommit,
  sections: readonly ChangelogSection[],
): string | null {
  const section = sectionFor(commit, sections);
  const kept = commit.breakingNote !== null || commit.releaseAs !== null;
  if (!kept && (section === undefined || section.hidden === true)) return null;

  return section?.section ?? commit.type;
}

function buildChangelog(
  commits: readonly ConventionalCommit[],
  sections: readonly ChangelogSection[],
): Changelog {
  const breaking: ChangelogEntry[] = [];
  const grouped = new Map<string, ChangelogEntry[]>();
  for (const commit of commits) {
    const title = shownUnder(commit, sections);
    if (title === null) continue;

    if (commit.breakingNote !== null)
      breaking.push({ scope: commit.scope, text: commit.breakingNote });
    const entries = grouped.get(title) ?? [];
    entries.push({ scope: commit.scope, text: commit.subject });
    grouped.set(title, entries);
  }

  const order = sections.map((section) => section.section);
  const groups = [...grouped]
    .map(([title, entries]) => ({ title, entries }))
    .toSorted((a, b) => order.indexOf(a.title) - order.indexOf(b.title));
  return { breaking, groups };
}

function entryLine(entry: ChangelogEntry): string {
  const scope = entry.scope === null ? '' : `**${entry.scope}:** `;
  return `* ${scope}${entry.text}`;
}

function changelogMarkdown(version: Version, changelog: Changelog): string {
  const breaking =
    changelog.breaking.length === 0
      ? []
      : ['### ⚠ BREAKING CHANGES', changelog.breaking.map(entryLine).join('\n')];
  const groups = changelog.groups.flatMap((group) => [
    `### ${group.title}`,
    group.entries.map(entryLine).join('\n'),
  ]);
  return [`## ${formatVersion(version)}`, ...breaking, ...groups].join('\n\n');
}

function isEmptyChangelog(changelog: Changelog): boolean {
  return changelog.breaking.length === 0 && changelog.groups.length === 0;
}

type VersionChoice =
  | { readonly kind: 'version'; readonly version: Version }
  | { readonly kind: 'bad-release-as'; readonly text: string };

function chosenVersion(current: Version, reason: BumpReason): VersionChoice {
  return match<BumpReason, VersionChoice>(reason)
    .with({ kind: 'release-as' }, ({ text }) => {
      const version = parseVersion(text);
      return version === null ? { kind: 'bad-release-as', text } : { kind: 'version', version };
    })
    .with({ kind: 'breaking' }, { kind: 'feature' }, { kind: 'other' }, ({ update }) => ({
      kind: 'version',
      version: applyUpdate(current, update),
    }))
    .exhaustive();
}

function nextRelease(
  current: Version,
  newestFirst: readonly ConventionalCommit[],
  options: BumpOptions,
  sections: readonly ChangelogSection[],
): NextRelease {
  if (newestFirst.length === 0) return { kind: 'no-commits' };

  const reason = releaseType(current, newestFirst, options);
  const choice = chosenVersion(current, reason);
  if (choice.kind === 'bad-release-as') return choice;

  const { version } = choice;

  const changelog = buildChangelog(newestFirst, sections);
  if (isEmptyChangelog(changelog)) return { kind: 'nothing-to-release', version, reason };

  return { kind: 'release', version, reason, changelog };
}

export {
  applyUpdate,
  buildChangelog,
  changelogMarkdown,
  formatVersion,
  isPreMajor,
  nextRelease,
  parseVersion,
};
export type {
  BumpOptions,
  BumpReason,
  Changelog,
  ChangelogEntry,
  ChangelogGroup,
  ChangelogSection,
  NextRelease,
  Version,
  VersionUpdate,
};
