import { describe, expect, it } from 'vitest';
import { describePageObstacle } from './epub-obstacle-text';
import type { PageObstacle } from './epub-pages';

const OBSTACLES: readonly PageObstacle[] = [
  { kind: 'spine-unreadable' },
  { kind: 'spine-empty' },
  { kind: 'unmanifested', idref: 'p003' },
  { kind: 'page-missing', path: 'OEBPS/text/003.xhtml' },
  { kind: 'no-image', path: 'OEBPS/text/003.xhtml' },
  { kind: 'many-images', path: 'OEBPS/text/003.xhtml', count: 2 },
  { kind: 'text-beside-the-image', path: 'OEBPS/text/003.xhtml', text: 'あとがき' },
  { kind: 'image-missing', path: 'OEBPS/text/003.xhtml', image: 'OEBPS/img/003.jpg' },
];

describe('describePageObstacle', () => {
  it('names the page that refused the book', () => {
    expect(describePageObstacle({ kind: 'many-images', path: 'OEBPS/003.xhtml', count: 2 })).toBe(
      'OEBPS/003.xhtml holds 2 images. Only an EPUB of one full-page image per page can be read yet.',
    );
  });

  it('quotes the text it found beside the image', () => {
    const said = describePageObstacle({
      kind: 'text-beside-the-image',
      path: 'OEBPS/003.xhtml',
      text: 'あとがき',
    });

    expect(said).toContain('あとがき');
  });

  it('spells every obstacle in words, never as the name of its variant', () => {
    for (const obstacle of OBSTACLES) {
      const said = describePageObstacle(obstacle);

      expect(said).not.toContain(obstacle.kind);
      expect(said.endsWith('.')).toBe(true);
    }
  });
});
