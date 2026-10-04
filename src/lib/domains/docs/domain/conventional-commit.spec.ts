import { describe, expect, it } from 'vitest';
import { conventionalCommits, parseMessage } from './conventional-commit';

describe('parseMessage, after the grammar of @conventional-commits/parser', () => {
  it('reads the type, scope, bang and description of the summary', () => {
    const parsed = parseMessage('feat(export)!: drop the old file format');

    expect(parsed).toEqual({
      kind: 'conventional',
      header: {
        type: 'feat',
        scope: 'export',
        bang: true,
        description: 'drop the old file format',
      },
      body: '',
      footers: [],
    });
  });

  it('accepts a summary with no space after the colon, as the parser grammar does', () => {
    const parsed = parseMessage('fix:tidy');

    expect(parsed.kind === 'conventional' && parsed.header.description).toBe('tidy');
  });

  it('reports a summary with no type as not conventional', () => {
    expect(parseMessage('Update the reader').kind).toBe('not-conventional');
    expect(parseMessage('feat (export): spaced').kind).toBe('not-conventional');
  });

  it('separates the body from the footers and joins a footer continuation', () => {
    const parsed = parseMessage(
      'feat: one\n\nA body line.\nAnother.\n\nBREAKING CHANGE: the format\n  changed\nRefs #12',
    );

    expect(parsed.kind === 'conventional' && parsed.body).toBe('A body line.\nAnother.');
    expect(parsed.kind === 'conventional' && parsed.footers).toEqual([
      { token: 'BREAKING CHANGE', separator: ': ', value: 'the format\nchanged' },
      { token: 'Refs', separator: ' #', value: '12' },
    ]);
  });
});

describe('conventionalCommits, after parseConventionalCommits in release-please src/commit.ts', () => {
  it('uses the description as the breaking note of a bang', () => {
    const [commit] = conventionalCommits('fix!: links to /read/<id> change');

    expect(commit?.breakingNote).toBe('links to /read/<id> change');
  });

  it('prefers the BREAKING CHANGE footer text over the description', () => {
    const [commit] = conventionalCommits('feat!: new format\n\nBREAKING CHANGE: export again');

    expect(commit?.breakingNote).toBe('export again');
  });

  it('treats BREAKING-CHANGE as a synonym', () => {
    const [commit] = conventionalCommits('refactor: store\n\nBREAKING-CHANGE: books need a reload');

    expect(commit?.breakingNote).toBe('books need a reload');
  });

  it('leaves a lower-case breaking change line as body text', () => {
    const [commit] = conventionalCommits('feat: x\n\nbreaking change: not a footer');

    expect(commit?.breakingNote).toBeNull();
  });

  it('reads a Release-As footer in any letter case', () => {
    const commit = conventionalCommits('chore: release 1.0.0\n\nrelease-as: 1.0.0').at(-1);

    expect(commit?.releaseAs).toBe('1.0.0');
  });

  it('adds a commit for each footer that parses as a commit, before the header commit', () => {
    const commits = conventionalCommits(
      'feat: adds v4 UUID to crypto\n\nfix(utils): unicode no longer throws exception',
    );

    expect(commits.map((commit) => [commit.type, commit.scope, commit.subject])).toEqual([
      ['fix', 'utils', 'unicode no longer throws exception'],
      ['feat', null, 'adds v4 UUID to crypto'],
    ]);
  });

  it('drops a message that is not conventional', () => {
    expect(conventionalCommits('Merge branch main')).toEqual([]);
  });
});
