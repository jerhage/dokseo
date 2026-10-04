import { match } from 'ts-pattern';
import { conventionalCommits, parseMessage } from './conventional-commit';
import type { CommitHeader } from './conventional-commit';
import { DOKSEO_COMMIT_TYPES, isDokseoCommitType } from './dokseo-release';
import { nextRelease, parseVersion } from './release-bump';
import type { BumpOptions, ChangelogSection, NextRelease, Version } from './release-bump';

type CommitProblem =
  | { readonly kind: 'empty' }
  | { readonly kind: 'no-colon' }
  | { readonly kind: 'no-space' }
  | { readonly kind: 'bad-prefix' }
  | { readonly kind: 'no-description' }
  | { readonly kind: 'type-case'; readonly type: string }
  | { readonly kind: 'type-not-allowed'; readonly type: string }
  | { readonly kind: 'no-blank-line' }
  | { readonly kind: 'breaking-footer-format'; readonly line: string }
  | { readonly kind: 'release-as-not-a-version'; readonly value: string };

type CommitCheck =
  | { readonly kind: 'accepted'; readonly header: CommitHeader; readonly breaking: boolean }
  | { readonly kind: 'rejected'; readonly problems: readonly CommitProblem[] };

type CommitEffect = {
  readonly from: Version;
  readonly release: NextRelease;
};

const BREAKING_WORDS = /^breaking[ -]change\b/iu;

const BREAKING_FOOTER = /^BREAKING[ -]CHANGE: \S/u;

function headerProblems(summary: string): readonly CommitProblem[] {
  if (summary.trim() === '') return [{ kind: 'empty' }];
  if (!summary.includes(':')) return [{ kind: 'no-colon' }];

  const parsed = parseMessage(summary);
  if (parsed.kind === 'not-conventional') return [{ kind: 'bad-prefix' }];
  if (parsed.header.description.trim() === '') return [{ kind: 'no-description' }];
  if (!/^[^:]*: /u.test(summary)) return [{ kind: 'no-space' }];

  return typeProblems(parsed.header.type);
}

function typeProblems(type: string): readonly CommitProblem[] {
  if (isDokseoCommitType(type)) return [];
  if (isDokseoCommitType(type.toLowerCase())) return [{ kind: 'type-case', type }];

  return [{ kind: 'type-not-allowed', type }];
}

function bodyProblems(rest: readonly string[]): readonly CommitProblem[] {
  const problems: CommitProblem[] = [];
  const [second] = rest;
  if (second !== undefined && second.trim() !== '') problems.push({ kind: 'no-blank-line' });

  for (const line of rest) {
    if (BREAKING_WORDS.test(line) && !BREAKING_FOOTER.test(line))
      problems.push({ kind: 'breaking-footer-format', line });
    const releaseAs = /^release-as: (.*)$/iu.exec(line)?.[1];
    if (releaseAs !== undefined && parseVersion(releaseAs) === null)
      problems.push({ kind: 'release-as-not-a-version', value: releaseAs });
  }
  return problems;
}

function checkCommit(message: string): CommitCheck {
  const [summary = '', ...rest] = message.replace(/\r\n/gu, '\n').trim().split('\n');
  const problems = [...headerProblems(summary), ...bodyProblems(rest)];
  const parsed = parseMessage(message);
  if (problems.length > 0 || parsed.kind === 'not-conventional')
    return { kind: 'rejected', problems };

  const own = conventionalCommits(message).at(-1);
  const breaking = own !== undefined && own.breakingNote !== null;
  return { kind: 'accepted', header: parsed.header, breaking };
}

function commitEffect(
  message: string,
  from: Version,
  options: BumpOptions,
  sections: readonly ChangelogSection[],
): CommitEffect {
  return { from, release: nextRelease(from, conventionalCommits(message), options, sections) };
}

function problemText(problem: CommitProblem): string {
  return match(problem)
    .with({ kind: 'empty' }, () => 'The message is empty.')
    .with(
      { kind: 'no-colon' },
      () => 'The first line needs a type, then a colon and a space: "fix: …".',
    )
    .with(
      { kind: 'no-space' },
      () => 'The specification requires a space after the colon: "fix: …", not "fix:…".',
    )
    .with(
      { kind: 'bad-prefix' },
      () =>
        'The text before the colon is not a type with an optional (scope) and !. A type has no spaces.',
    )
    .with({ kind: 'no-description' }, () => 'A description must follow the colon and space.')
    .with(
      { kind: 'type-case' },
      ({ type }) =>
        `Dokseo writes types in lower case: "${type.toLowerCase()}", not "${type}". release-please compares the type exactly when it picks the bump.`,
    )
    .with(
      { kind: 'type-not-allowed' },
      ({ type }) => `"${type}" is not one of Dokseo's types: ${DOKSEO_COMMIT_TYPES.join(', ')}.`,
    )
    .with(
      { kind: 'no-blank-line' },
      () => 'Leave one blank line between the first line and the body or footers.',
    )
    .with(
      { kind: 'breaking-footer-format' },
      ({ line }) =>
        `"${line}" looks like a breaking-change footer. Write it as "BREAKING CHANGE: " in capitals, followed by a description.`,
    )
    .with(
      { kind: 'release-as-not-a-version' },
      ({ value }) => `Release-As needs a version such as 1.0.0, not "${value}".`,
    )
    .exhaustive();
}

export { checkCommit, commitEffect, problemText };
export type { CommitCheck, CommitEffect, CommitProblem };
