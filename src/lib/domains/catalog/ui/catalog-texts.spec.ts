import { describe, expect, it } from 'vitest';
import { catalogId } from '$lib/shared/ids';
import type { Catalog } from '../domain/catalog';
import type { TestCatalogConnectionResult } from '../use-cases/test-catalog-connection';
import {
  BLOCKED_TEXT,
  FEED_TOO_LARGE_TEXT,
  FORMAT_CHOICE_TEXT,
  OFFLINE_CATALOG_TEXT,
  PASSWORD_NEEDED_TEXT,
  UNAUTHORIZED_TEXT,
  browseFailureText,
  catalogDescription,
  catalogHost,
  connectionOutcome,
  downloadFailureText,
  feedProblemText,
  fieldRefusal,
  needsPickText,
  updateFailureText,
} from './catalog-texts';

describe('connectionOutcome', () => {
  it('names the feed title on success', () => {
    expect(
      connectionOutcome(
        { kind: 'success', feedTitle: 'Sample Library', feedKind: 'navigation' },
        'opds1',
      ),
    ).toEqual({ variant: 'success', text: 'Connected: Sample Library.' });
  });

  it('words each outcome on its own', () => {
    const results: readonly TestCatalogConnectionResult[] = [
      { kind: 'not-a-catalog' },
      { kind: 'locked' },
      { kind: 'unauthorized' },
      { kind: 'not-found' },
      { kind: 'server-error', status: 502 },
      { kind: 'blocked' },
      { kind: 'offline' },
      { kind: 'aborted' },
    ];
    const texts = results.map((result) => connectionOutcome(result, 'opds1').text);
    expect(new Set(texts).size).toBe(texts.length);
    expect(texts).toContain('The server refused the username or password.');
    expect(texts).toContain('This address answers, but not with an OPDS catalog.');
    expect(texts).toContain('The server answered with an error (status 502).');
  });

  it('sends the three draft refusals to the fields with one shared text', () => {
    const texts = [
      connectionOutcome({ kind: 'empty-title' }, 'opds1').text,
      connectionOutcome({ kind: 'invalid-url', problem: 'insecure' }, 'opds1').text,
      connectionOutcome({ kind: 'missing-username' }, 'opds1').text,
    ];
    expect(new Set(texts).size).toBe(1);
  });

  it('explains the blocked causes in plain words', () => {
    const { text } = connectionOutcome({ kind: 'blocked' }, 'opds1');
    expect(text).toBe(BLOCKED_TEXT);
    expect(text).toContain('CORS');
    expect(text).toContain('local network access');
    expect(text).toContain('not HTTPS');
  });
});

describe('fieldRefusal', () => {
  it('maps each refusal to its field', () => {
    expect(fieldRefusal({ kind: 'empty-title' }).field).toBe('title');
    expect(fieldRefusal({ kind: 'invalid-url', problem: 'credentials' }).field).toBe('url');
    expect(fieldRefusal({ kind: 'missing-username' }).field).toBe('username');
  });

  it('words each address problem differently', () => {
    const texts = (['unparseable', 'insecure', 'credentials'] as const).map(
      (problem) => fieldRefusal({ kind: 'invalid-url', problem }).text,
    );
    expect(new Set(texts).size).toBe(3);
  });
});

describe('catalogDescription', () => {
  const base = {
    id: catalogId('c'),
    title: 'T',
    protocol: 'opds1' as const,
    rootUrl: 'https://shelf.example:8080/opds',
  };

  it('shows only the host for a catalog without sign-in', () => {
    const catalog: Catalog = { ...base, auth: { kind: 'none' } };
    expect(catalogDescription(catalog)).toBe('shelf.example:8080');
  });

  it('adds the username and the password note for basic', () => {
    const catalog: Catalog = { ...base, auth: { kind: 'basic', username: 'jo' } };
    expect(catalogDescription(catalog)).toBe(
      'shelf.example:8080 · jo · Password: asked each session',
    );
  });

  it('falls back to the raw address when it cannot be parsed', () => {
    expect(catalogHost('not a url')).toBe('not a url');
  });
});

describe('browseFailureText', () => {
  it('tells an offline reader the catalog needs a connection and downloads stay readable', () => {
    expect(browseFailureText({ kind: 'offline' }, 'opds1')).toBe(OFFLINE_CATALOG_TEXT);
    expect(OFFLINE_CATALOG_TEXT).toContain('downloaded');
  });

  it('reuses the blocked text of the connection test', () => {
    expect(browseFailureText({ kind: 'blocked' }, 'opds1')).toBe(BLOCKED_TEXT);
  });

  it('names the status of a server error', () => {
    expect(browseFailureText({ kind: 'server-error', status: 503 }, 'opds1')).toContain('503');
  });

  it('words each failure on its own', () => {
    const texts = [
      browseFailureText({ kind: 'not-a-catalog' }, 'opds1'),
      browseFailureText({ kind: 'not-found' }, 'opds1'),
      browseFailureText({ kind: 'offline' }, 'opds1'),
      browseFailureText({ kind: 'unknown-catalog', id: catalogId('c') }, 'opds1'),
      browseFailureText({ kind: 'unreadable-catalog', id: catalogId('c') }, 'opds1'),
      browseFailureText({ kind: 'storage-unavailable' }, 'opds1'),
    ];
    expect(new Set(texts).size).toBe(texts.length);
  });
});

describe('browseFailureText on a feed past the size limit', () => {
  it('says the feed is too large instead of blaming the server', () => {
    expect(browseFailureText({ kind: 'feed-too-large' }, 'opds1')).toBe(FEED_TOO_LARGE_TEXT);
  });
});

describe('needsPickText', () => {
  it('counts one book and several books', () => {
    expect(needsPickText(1)).toBe(
      '1 book offers several files. Open each one to choose which file to download.',
    );
    expect(needsPickText(3)).toContain('3 books offer several files');
  });
});

describe('downloadFailureText', () => {
  it('sends a reader who must choose a file to the book', () => {
    expect(updateFailureText({ kind: 'format-choice' }, () => '')).toBe(FORMAT_CHOICE_TEXT);
  });

  it('describes a file the library refused through the library text', () => {
    const text = downloadFailureText(
      { kind: 'fingerprint', cause: 'x' },
      (failure) => failure.kind,
    );
    expect(text).toBe('fingerprint');
  });

  it('asks for the sign-in again when the server refused it', () => {
    expect(downloadFailureText({ kind: 'unauthorized' }, () => '')).toBe(
      'The server refused the username or password.',
    );
  });
});

describe('feedProblemText', () => {
  it('asks for the password when the catalog is locked', () => {
    expect(feedProblemText({ kind: 'locked', id: catalogId('home') }, 'opds1')).toBe(
      PASSWORD_NEEDED_TEXT,
    );
  });

  it('says the server refused the password when it is unauthorized', () => {
    expect(feedProblemText({ kind: 'unauthorized' }, 'opds1')).toBe(UNAUTHORIZED_TEXT);
  });

  it('shows the message of an unexpected failure as it is', () => {
    expect(
      feedProblemText({ kind: 'unexpected', message: 'Something went wrong: x' }, 'opds1'),
    ).toBe('Something went wrong: x');
  });

  it('words an expected failure as the browse texts do', () => {
    expect(feedProblemText({ kind: 'offline' }, 'opds1')).toBe(OFFLINE_CATALOG_TEXT);
    expect(feedProblemText({ kind: 'server-error', status: 503 }, 'opds1')).toContain('503');
    expect(feedProblemText({ kind: 'not-a-catalog' }, 'opds1')).toBe(
      browseFailureText({ kind: 'not-a-catalog' }, 'opds1'),
    );
  });
});
