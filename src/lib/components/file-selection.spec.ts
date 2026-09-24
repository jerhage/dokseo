import { describe, expect, it } from 'vitest';
import {
  acceptRules,
  describeRejection,
  fileVerdict,
  formatFileSize,
  selectFiles,
} from './file-selection';
import type { FileLike, SelectionPolicy } from './file-selection';

const MB = 1024 * 1024;

function file(name: string, type: string, size = 100): FileLike {
  return { name, type, size };
}

function policy(overrides: Partial<SelectionPolicy> = {}): SelectionPolicy {
  return { rules: [], maxSize: undefined, multiple: true, ...overrides };
}

describe('acceptRules', () => {
  it('returns no rules for an absent or blank accept string', () => {
    expect(acceptRules(undefined)).toEqual([]);
    expect(acceptRules('  , ')).toEqual([]);
  });

  it('reads an extension, a type family and an exact type', () => {
    expect(acceptRules('.pdf, image/*,application/zip')).toEqual([
      { kind: 'extension', extension: '.pdf' },
      { kind: 'family', prefix: 'image/' },
      { kind: 'type', type: 'application/zip' },
    ]);
  });

  it('lowercases every entry', () => {
    expect(acceptRules('.CBZ,Image/*')).toEqual([
      { kind: 'extension', extension: '.cbz' },
      { kind: 'family', prefix: 'image/' },
    ]);
  });
});

describe('fileVerdict', () => {
  it('accepts any file when there are no rules and no limit', () => {
    expect(fileVerdict(file('notes', ''), policy())).toEqual({ kind: 'accepted' });
  });

  it('accepts a file whose extension matches, in any case', () => {
    const rules = acceptRules('.pdf');

    expect(fileVerdict(file('Brief.PDF', ''), policy({ rules }))).toEqual({ kind: 'accepted' });
  });

  it('accepts a file whose type falls in an accepted family', () => {
    const rules = acceptRules('image/*');

    expect(fileVerdict(file('a.png', 'image/png'), policy({ rules }))).toEqual({
      kind: 'accepted',
    });
  });

  it('accepts a file whose type matches exactly, in any case', () => {
    const rules = acceptRules('application/zip');

    expect(fileVerdict(file('a.cbz', 'Application/ZIP'), policy({ rules }))).toEqual({
      kind: 'accepted',
    });
  });

  it('rejects a file that matches no rule as the wrong type', () => {
    const rules = acceptRules('image/*,.pdf');

    expect(fileVerdict(file('a.zip', 'application/zip'), policy({ rules }))).toEqual({
      kind: 'wrong-type',
    });
  });

  it('rejects a file with no type against a family rule', () => {
    const rules = acceptRules('image/*');

    expect(fileVerdict(file('a.png', ''), policy({ rules }))).toEqual({ kind: 'wrong-type' });
  });

  it('rejects a type that only shares a prefix with an exact rule', () => {
    const rules = acceptRules('image/png');

    expect(fileVerdict(file('a.png', 'image/pngx'), policy({ rules }))).toEqual({
      kind: 'wrong-type',
    });
  });

  it('rejects a file above the limit as too large, carrying the limit', () => {
    expect(fileVerdict(file('a.pdf', '', 5 * MB + 1), policy({ maxSize: 5 * MB }))).toEqual({
      kind: 'too-large',
      limit: 5 * MB,
    });
  });

  it('accepts a file exactly at the limit', () => {
    expect(fileVerdict(file('a.pdf', '', 5 * MB), policy({ maxSize: 5 * MB }))).toEqual({
      kind: 'accepted',
    });
  });

  it('reports a file both too large and of the wrong type as too large', () => {
    const rules = acceptRules('.pdf');

    expect(fileVerdict(file('a.zip', '', 20), policy({ rules, maxSize: 10 }))).toEqual({
      kind: 'too-large',
      limit: 10,
    });
  });
});

describe('selectFiles', () => {
  const rules = acceptRules('image/*');
  const photo = file('photo.jpg', 'image/jpeg');
  const scan = file('scan.png', 'image/png');
  const archive = file('book.zip', 'application/zip');
  const poster = file('poster.png', 'image/png', 3 * MB);

  it('splits a batch into accepted files and rejected files with their reasons, in order', () => {
    const selection = selectFiles([archive, photo, poster, scan], policy({ rules, maxSize: MB }));

    expect(selection).toEqual({
      accepted: [photo, scan],
      rejected: [
        { file: archive, reason: { kind: 'wrong-type' } },
        { file: poster, reason: { kind: 'too-large', limit: MB } },
      ],
    });
  });

  it('keeps only the first accepted file when a single file is allowed', () => {
    const selection = selectFiles([archive, photo, scan], policy({ rules, multiple: false }));

    expect(selection.accepted).toEqual([photo]);
    expect(selection.rejected).toEqual([{ file: archive, reason: { kind: 'wrong-type' } }]);
  });

  it('returns the same file objects it was given', () => {
    const selection = selectFiles([photo], policy());

    expect(selection.accepted[0]).toBe(photo);
  });

  it('returns empty lists for an empty batch', () => {
    expect(selectFiles([], policy())).toEqual({ accepted: [], rejected: [] });
  });
});

describe('formatFileSize', () => {
  it('writes a size under a kilobyte in bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1023)).toBe('1023 B');
  });

  it('writes kilobytes with one decimal', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(422_707)).toBe('412.8 KB');
  });

  it('writes megabytes with one decimal', () => {
    expect(formatFileSize(MB)).toBe('1.0 MB');
    expect(formatFileSize(5 * MB)).toBe('5.0 MB');
    expect(formatFileSize(2.25 * MB)).toBe('2.3 MB');
  });

  it('moves to megabytes rather than print 1024.0 KB', () => {
    expect(formatFileSize(MB - 1)).toBe('1.0 MB');
  });
});

describe('describeRejection', () => {
  it('names the limit a file exceeded', () => {
    expect(describeRejection({ kind: 'too-large', limit: 5 * MB })).toBe('Larger than 5.0 MB');
  });

  it('names a disallowed type', () => {
    expect(describeRejection({ kind: 'wrong-type' })).toBe('File type not allowed');
  });
});
