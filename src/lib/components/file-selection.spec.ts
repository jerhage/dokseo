import { describe, expect, it } from 'vitest';
import {
  ANY_FILE_POLICY,
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

  it('accepts a file whose extension, type family or exact type matches, in any case', () => {
    expect([
      fileVerdict(file('Brief.PDF', ''), policy({ rules: acceptRules('.pdf') })),
      fileVerdict(file('a.png', 'image/png'), policy({ rules: acceptRules('image/*') })),
      fileVerdict(
        file('a.cbz', 'Application/ZIP'),
        policy({ rules: acceptRules('application/zip') }),
      ),
    ]).toEqual([{ kind: 'accepted' }, { kind: 'accepted' }, { kind: 'accepted' }]);
  });

  it('rejects as the wrong type a file that matches no rule, has no type against a family, or only shares a prefix with an exact type', () => {
    expect([
      fileVerdict(file('a.zip', 'application/zip'), policy({ rules: acceptRules('image/*,.pdf') })),
      fileVerdict(file('a.png', ''), policy({ rules: acceptRules('image/*') })),
      fileVerdict(file('a.png', 'image/pngx'), policy({ rules: acceptRules('image/png') })),
    ]).toEqual([{ kind: 'wrong-type' }, { kind: 'wrong-type' }, { kind: 'wrong-type' }]);
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
      arrived: [
        { file: archive, verdict: { kind: 'wrong-type' } },
        { file: photo, verdict: { kind: 'accepted' } },
        { file: poster, verdict: { kind: 'too-large', limit: MB } },
        { file: scan, verdict: { kind: 'accepted' } },
      ],
    });
  });

  it('reports every accepted file after the first as too many when a single file is allowed', () => {
    const selfie = file('selfie.jpg', 'image/jpeg');
    const selection = selectFiles(
      [archive, photo, scan, poster, selfie],
      policy({ rules, maxSize: MB, multiple: false }),
    );

    expect(selection).toEqual({
      accepted: [photo],
      rejected: [
        { file: archive, reason: { kind: 'wrong-type' } },
        { file: scan, reason: { kind: 'too-many' } },
        { file: poster, reason: { kind: 'too-large', limit: MB } },
        { file: selfie, reason: { kind: 'too-many' } },
      ],
      arrived: [
        { file: archive, verdict: { kind: 'wrong-type' } },
        { file: photo, verdict: { kind: 'accepted' } },
        { file: scan, verdict: { kind: 'too-many' } },
        { file: poster, verdict: { kind: 'too-large', limit: MB } },
        { file: selfie, verdict: { kind: 'too-many' } },
      ],
    });
  });

  it('accepts every file, in order, under the policy for any file', () => {
    const selection = selectFiles([archive, poster, photo], ANY_FILE_POLICY);

    expect(selection.accepted).toEqual([archive, poster, photo]);
    expect(selection.rejected).toEqual([]);
  });

  it('returns the same file objects it was given', () => {
    const selection = selectFiles([photo], policy());

    expect(selection.accepted[0]).toBe(photo);
    expect(selection.arrived[0]?.file).toBe(photo);
  });

  it('returns empty lists for an empty batch', () => {
    expect(selectFiles([], policy())).toEqual({ accepted: [], rejected: [], arrived: [] });
  });
});

describe('formatFileSize', () => {
  it('writes bytes under a kilobyte, and kilobytes and megabytes with one decimal', () => {
    expect([0, 1023, 1024, 422_707, MB, 5 * MB, 2.25 * MB].map(formatFileSize)).toEqual([
      '0 B',
      '1023 B',
      '1.0 KB',
      '412.8 KB',
      '1.0 MB',
      '5.0 MB',
      '2.3 MB',
    ]);
  });

  it('moves to megabytes rather than print 1024.0 KB', () => {
    expect(formatFileSize(MB - 1)).toBe('1.0 MB');
  });
});

describe('describeRejection', () => {
  it('names the limit a file exceeded, a disallowed type and a file beyond the one allowed', () => {
    expect([
      describeRejection({ kind: 'too-large', limit: 5 * MB }),
      describeRejection({ kind: 'wrong-type' }),
      describeRejection({ kind: 'too-many' }),
    ]).toEqual(['Larger than 5.0 MB', 'File type not allowed', 'Only one file at a time']);
  });
});
