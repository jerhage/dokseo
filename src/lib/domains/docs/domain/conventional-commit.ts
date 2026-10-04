type CommitFooter = {
  readonly token: string;
  readonly separator: ': ' | ' #';
  readonly value: string;
};

type CommitHeader = {
  readonly type: string;
  readonly scope: string | null;
  readonly bang: boolean;
  readonly description: string;
};

type ParsedMessage =
  | {
      readonly kind: 'conventional';
      readonly header: CommitHeader;
      readonly body: string;
      readonly footers: readonly CommitFooter[];
    }
  | { readonly kind: 'not-conventional'; readonly summary: string };

type ConventionalCommit = {
  readonly type: string;
  readonly scope: string | null;
  readonly subject: string;
  readonly breakingNote: string | null;
  readonly releaseAs: string | null;
};

const HEADER = /^([^\s():!]+)(?:\(([^()\r\n]+)\))?(!)?:\s*(.*)$/u;

const FOOTER = /^(BREAKING CHANGE|BREAKING-CHANGE|[^\s():!#]+(?:\([^()\r\n]+\))?!?)(: | #)(.*)$/u;

const BREAKING_TOKENS: ReadonlySet<string> = new Set(['BREAKING CHANGE', 'BREAKING-CHANGE']);

const BODY_BREAKING_CHANGE = /BREAKING-CHANGE:\s*(.*)/u;

function parseHeader(line: string): CommitHeader | null {
  const found = HEADER.exec(line);
  if (found === null) return null;

  const [, type = '', scope, bang, description = ''] = found;
  return { type, scope: scope ?? null, bang: bang !== undefined, description };
}

function footerStart(line: string): CommitFooter | null {
  const found = FOOTER.exec(line);
  if (found === null) return null;

  const [, token = '', separator, value = ''] = found;
  return { token, separator: separator === ' #' ? ' #' : ': ', value: value.trim() };
}

function messageLines(message: string): readonly string[] {
  return message.replace(/\r\n/gu, '\n').split('\n');
}

function splitFooters(lines: readonly string[]): {
  readonly body: string;
  readonly footers: readonly CommitFooter[];
} {
  const start = lines.findIndex((line) => footerStart(line) !== null);
  if (start === -1) return { body: lines.join('\n').trim(), footers: [] };

  const footers: CommitFooter[] = [];
  for (const line of lines.slice(start)) {
    const opened = footerStart(line);
    const last = footers.at(-1);
    if (opened !== null) footers.push(opened);
    else if (last !== undefined && line.trim() !== '')
      footers[footers.length - 1] = { ...last, value: `${last.value}\n${line.trim()}` };
  }
  return { body: lines.slice(0, start).join('\n').trim(), footers };
}

function parseMessage(message: string): ParsedMessage {
  const [summary = '', ...rest] = messageLines(message.trim());
  const header = parseHeader(summary);
  if (header === null) return { kind: 'not-conventional', summary };

  const { body, footers } = splitFooters(rest);
  return { kind: 'conventional', header, body, footers };
}

function isBreakingFooter(footer: CommitFooter): boolean {
  return BREAKING_TOKENS.has(footer.token);
}

function breakingNote(
  header: CommitHeader,
  body: string,
  footers: readonly CommitFooter[],
): string {
  const footer = footers.findLast(isBreakingFooter);
  const marked = footer?.value ?? (header.bang ? header.description : '');
  const inBody = BODY_BREAKING_CHANGE.exec(body)?.[1]?.trim() ?? '';
  if (inBody === '') return marked;

  return marked === '' ? inBody : `${marked}\n${inBody}`;
}

function releaseAs(footers: readonly CommitFooter[]): string | null {
  const footer = footers.find((candidate) => candidate.token.toLowerCase() === 'release-as');
  return footer === undefined ? null : footer.value;
}

function footerCommit(footer: CommitFooter): ConventionalCommit | null {
  if (footer.separator === ' #' || isBreakingFooter(footer)) return null;

  const header = parseHeader(`${footer.token}: ${footer.value}`);
  if (header === null) return null;

  return {
    type: header.type,
    scope: header.scope,
    subject: header.description,
    breakingNote: header.bang && header.description !== '' ? header.description : null,
    releaseAs: null,
  };
}

function conventionalCommits(message: string): readonly ConventionalCommit[] {
  const parsed = parseMessage(message);
  if (parsed.kind === 'not-conventional') return [];

  const { header, body, footers } = parsed;
  const note = breakingNote(header, body, footers);
  const own: ConventionalCommit = {
    type: header.type,
    scope: header.scope,
    subject: header.description,
    breakingNote: note === '' ? null : note,
    releaseAs: releaseAs(footers),
  };
  const fromFooters = footers
    .map(footerCommit)
    .filter((commit): commit is ConventionalCommit => commit !== null);
  return [...fromFooters, own];
}

export { conventionalCommits, isBreakingFooter, parseMessage };
export type { CommitFooter, CommitHeader, ConventionalCommit, ParsedMessage };
