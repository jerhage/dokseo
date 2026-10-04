import type { BumpOptions, ChangelogSection } from './release-bump';

const DOKSEO_COMMIT_TYPES = [
  'chore',
  'feat',
  'fix',
  'docs',
  'refactor',
  'test',
  'perf',
  'style',
  'build',
  'ci',
] as const;

type DokseoCommitType = (typeof DOKSEO_COMMIT_TYPES)[number];

const DOKSEO_BUMP_OPTIONS: BumpOptions = {
  bumpMinorPreMajor: true,
  bumpPatchForMinorPreMajor: true,
};

const RELEASE_PLEASE_DEFAULTS: BumpOptions = {
  bumpMinorPreMajor: false,
  bumpPatchForMinorPreMajor: false,
};

const DOKSEO_CHANGELOG_SECTIONS: readonly ChangelogSection[] = [
  { type: 'feat', section: 'Features' },
  { type: 'fix', section: 'Fixes' },
  { type: 'perf', section: 'Performance' },
  { type: 'refactor', section: 'Refactoring', hidden: true },
  { type: 'test', section: 'Tests', hidden: true },
  { type: 'docs', section: 'Documentation', hidden: true },
  { type: 'chore', section: 'Chores', hidden: true },
  { type: 'style', section: 'Style', hidden: true },
  { type: 'build', section: 'Build', hidden: true },
  { type: 'ci', section: 'CI', hidden: true },
];

function isDokseoCommitType(type: string): type is DokseoCommitType {
  return DOKSEO_COMMIT_TYPES.some((allowed) => allowed === type);
}

export {
  DOKSEO_BUMP_OPTIONS,
  DOKSEO_CHANGELOG_SECTIONS,
  DOKSEO_COMMIT_TYPES,
  RELEASE_PLEASE_DEFAULTS,
  isDokseoCommitType,
};
export type { DokseoCommitType };
