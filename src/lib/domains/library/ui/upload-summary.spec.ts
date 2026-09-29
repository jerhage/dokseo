import { describe, expect, it } from 'vitest';
import { uploadSummary } from './upload-summary';

describe('uploadSummary', () => {
  it('counts every book added in one success', () => {
    expect(uploadSummary({ added: 5, held: 0, failures: [] })).toEqual({
      tone: 'success',
      title: 'Added 5 books',
    });
  });

  it('names the books the library already held beside the ones it added', () => {
    expect(uploadSummary({ added: 3, held: 2, failures: [] })).toEqual({
      tone: 'success',
      title: 'Added 3 books, 2 already in your library',
    });
  });

  it('reports an upload the library held entirely as information', () => {
    expect(uploadSummary({ added: 0, held: 2, failures: [] })).toEqual({
      tone: 'info',
      title: '2 books already in your library',
    });
  });

  it('uses the singular for one book', () => {
    expect(uploadSummary({ added: 1, held: 1, failures: [] })?.title).toBe(
      'Added 1 book, 1 already in your library',
    );
    expect(uploadSummary({ added: 0, held: 1, failures: [] })?.title).toBe(
      '1 book already in your library',
    );
  });

  it('leads a failure summary with what was kept, then names every failure', () => {
    expect(
      uploadSummary({
        added: 2,
        held: 1,
        failures: ['a.pdf could not be read: bad xref', 'c.cbz: Local storage failed: disk full'],
      }),
    ).toEqual({
      tone: 'danger',
      title: 'Could not add 2 of 5 books',
      message:
        'Added 2 books, 1 already in your library · a.pdf could not be read: bad xref · c.cbz: Local storage failed: disk full',
    });
  });

  it('names only the failures when nothing was kept', () => {
    expect(uploadSummary({ added: 0, held: 0, failures: ['a.pdf: x', 'b.pdf: y'] })).toEqual({
      tone: 'danger',
      title: 'Could not add 2 of 2 books',
      message: 'a.pdf: x · b.pdf: y',
    });
  });

  it('reports nothing for an upload with no books', () => {
    expect(uploadSummary({ added: 0, held: 0, failures: [] })).toBeNull();
  });
});
