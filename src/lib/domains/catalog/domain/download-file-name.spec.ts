import { describe, expect, it } from 'vitest';
import { basicAuthorization } from './basic-authorization';
import { dispositionFileName, fallbackFileName } from './download-file-name';

describe('dispositionFileName', () => {
  it('decodes a UTF-8 filename* in percent encoding', () => {
    const header = "attachment; filename*=UTF-8''%E3%83%AF%E3%83%B3%E3%83%94%E3%83%BC%E3%82%B9.cbz";

    expect(dispositionFileName(header)).toBe('ワンピース.cbz');
  });

  it('prefers filename* over a plain filename beside it', () => {
    const header = 'attachment; filename="fallback.epub"; filename*=UTF-8\'\'real%20name.epub';

    expect(dispositionFileName(header)).toBe('real name.epub');
  });

  it('reads a quoted filename with an escaped quote and a semicolon inside', () => {
    expect(dispositionFileName('attachment; filename="a \\"b\\"; c.epub"')).toBe('a b ; c.epub');
  });

  it('reads an unquoted filename', () => {
    expect(dispositionFileName('attachment; filename=book.pdf')).toBe('book.pdf');
  });

  it('answers null for a missing header, no filename, or an undecodable filename*', () => {
    expect(dispositionFileName(null)).toBeNull();
    expect(dispositionFileName('attachment')).toBeNull();
    expect(dispositionFileName("attachment; filename*=UTF-8''%E3%83")).toBeNull();
    expect(dispositionFileName("attachment; filename*=ISO-8859-1''caf%E9.epub")).toBeNull();
  });

  it('falls back to filename when filename* cannot be decoded', () => {
    expect(dispositionFileName('attachment; filename="ok.epub"; filename*=UTF-8\'\'%E3%83')).toBe(
      'ok.epub',
    );
  });

  it('strips path separators and leading dots from a name the server sends', () => {
    expect(dispositionFileName('attachment; filename="../etc/passwd.epub"')).toBe(
      'etc passwd.epub',
    );
  });
});

describe('fallbackFileName', () => {
  it('joins the title and the extension of the format', () => {
    expect(fallbackFileName('The Lantern Maker', 'epub')).toBe('The Lantern Maker.epub');
    expect(fallbackFileName('Vol. 1', 'cbz')).toBe('Vol. 1.cbz');
    expect(fallbackFileName('Manual', 'pdf')).toBe('Manual.pdf');
  });

  it('replaces characters a file name cannot hold', () => {
    expect(fallbackFileName('What? A/B: "C"', 'epub')).toBe('What A B C.epub');
  });

  it('names a blank title book', () => {
    expect(fallbackFileName(' ?? ', 'pdf')).toBe('book.pdf');
  });
});

describe('basicAuthorization', () => {
  it('encodes ASCII credentials as base64', () => {
    expect(basicAuthorization('user', 'pass')).toBe('Basic dXNlcjpwYXNz');
  });

  it('encodes a non-ASCII password as UTF-8 before base64', () => {
    expect(basicAuthorization('ユーザー', 'pä😀')).toBe(
      `Basic ${Buffer.from('ユーザー:pä😀', 'utf8').toString('base64')}`,
    );
  });
});
