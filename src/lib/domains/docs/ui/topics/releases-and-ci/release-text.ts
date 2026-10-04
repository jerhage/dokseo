import { match } from 'ts-pattern';
import { formatVersion } from '../../../domain/release-bump';
import type { BumpReason, NextRelease } from '../../../domain/release-bump';

function reasonText(reason: BumpReason): string {
  return match(reason)
    .with({ kind: 'release-as' }, ({ text }) => `a Release-As footer sets ${text}`)
    .with({ kind: 'breaking' }, ({ update }) => `a breaking change bumps the ${update}`)
    .with({ kind: 'feature' }, ({ update }) => `a feat bumps the ${update}`)
    .with({ kind: 'other' }, ({ update }) => `no feat and no break, so the ${update}`)
    .exhaustive();
}

function releaseHeadline(release: NextRelease): string {
  return match(release)
    .with({ kind: 'no-commits' }, () => 'No commits, so no release pull request.')
    .with(
      { kind: 'bad-release-as' },
      ({ text }) =>
        `Release-As: ${text} is not a version. Version.parse throws, and the action run fails.`,
    )
    .with(
      { kind: 'nothing-to-release' },
      ({ version }) =>
        `No release pull request: nothing in these commits belongs in the changelog. It would have been ${formatVersion(version)}.`,
    )
    .with(
      { kind: 'release' },
      ({ version, reason }) => `${formatVersion(version)}: ${reasonText(reason)}.`,
    )
    .exhaustive();
}

export { reasonText, releaseHeadline };
