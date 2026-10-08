import { describe, expect, it } from 'vitest';
import { checkedDraft } from './catalog-draft';

const NONE = { kind: 'none' } as const;

function draftAt(rootUrl: string) {
  return { title: 'Calibre', rootUrl, auth: NONE };
}

describe('checkedDraft', () => {
  it.each(['https://books.example/opds', 'http://localhost:8080/opds', 'http://127.0.0.1/opds'])(
    'accepts %s',
    (rootUrl) => {
      expect(checkedDraft(draftAt(rootUrl)).kind).toBe('valid');
    },
  );

  it('trims the title and the root url and normalises the url', () => {
    const checked = checkedDraft({
      title: '  Calibre  ',
      rootUrl: '  https://books.example  ',
      auth: NONE,
    });

    expect(checked).toEqual({
      kind: 'valid',
      draft: { title: 'Calibre', rootUrl: 'https://books.example/', auth: NONE },
    });
  });

  it('trims the username of basic auth', () => {
    const checked = checkedDraft({
      ...draftAt('https://books.example/opds'),
      auth: { kind: 'basic', username: ' reader ' },
    });

    expect(checked.kind === 'valid' && checked.draft.auth).toEqual({
      kind: 'basic',
      username: 'reader',
    });
  });

  it.each([
    ['plain http to a remote host', 'http://books.example/opds', 'insecure'],
    ['http to a local network address', 'http://192.168.1.5/opds', 'insecure'],
    ['a scheme that is not http', 'ftp://books.example/opds', 'insecure'],
    ['text that is not a url', 'books.example', 'unparseable'],
    ['a url that carries a password', 'https://reader:secret@books.example/', 'credentials'],
  ] as const)('rejects %s', (_name, rootUrl, problem) => {
    expect(checkedDraft(draftAt(rootUrl))).toEqual({ kind: 'invalid-url', problem });
  });

  it('rejects a title that is blank', () => {
    expect(checkedDraft({ ...draftAt('https://books.example/'), title: '   ' })).toEqual({
      kind: 'empty-title',
    });
  });

  it('rejects basic auth with a blank username', () => {
    const checked = checkedDraft({
      ...draftAt('https://books.example/'),
      auth: { kind: 'basic', username: ' ' },
    });

    expect(checked).toEqual({ kind: 'missing-username' });
  });
});
