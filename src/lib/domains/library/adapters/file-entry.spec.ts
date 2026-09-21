import { describe, expect, it } from 'vitest';
import { entryName, titleCandidate } from './file-entry';

const COMPOSED = '나 혼자만 레벨업 1권.cbz';

function fileNamed(name: string, path = ''): File {
  return { name, webkitRelativePath: path } as unknown as File;
}

describe('entryName', () => {
  it('composes a name macOS handed over decomposed', () => {
    const entry = entryName(fileNamed(COMPOSED.normalize('NFD')));

    expect(entry).toBe(COMPOSED);
    expect(entry.normalize('NFC')).toBe(entry);
  });

  it('composes the path when a folder was dropped', () => {
    const entry = entryName(fileNamed('01.jpg', '나 혼자만/01.jpg'.normalize('NFD')));

    expect(entry).toBe('나 혼자만/01.jpg');
  });

  it('leaves text that is already composed alone', () => {
    expect(entryName(fileNamed('One Piece v01.cbz'))).toBe('One Piece v01.cbz');
  });
});

describe('titleCandidate', () => {
  it('composes both halves, because either can become the title', () => {
    const candidate = titleCandidate(
      fileNamed(COMPOSED.normalize('NFD'), '나 혼자만/01.jpg'.normalize('NFD')),
    );

    expect(candidate.name).toBe(COMPOSED);
    expect(candidate.path).toBe('나 혼자만/01.jpg');
  });

  it('composes canonically and NOT compatibly, so a title keeps its own characters', () => {
    const candidate = titleCandidate(fileNamed('①巻 ﬁnale Ａ.cbz'));

    expect(candidate.name).toBe('①巻 ﬁnale Ａ.cbz');
    expect(candidate.name).not.toContain('1巻');
    expect(candidate.name).not.toContain('finale');
  });
});
