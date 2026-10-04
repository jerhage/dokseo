import { describe, expect, it } from 'vitest';
import { buildCapturesFile } from '$lib/domains/storage/use-cases/build-captures-file';
import {
  HARBOR_FIRST,
  LANTERNS,
  ORPHAN,
  PIXEL_RECT_ROWS,
  SAMPLE_HOLDINGS,
  VOCAB,
  bookTitle,
  fileContents,
  hasOrphan,
  isRemoved,
  sampleTime,
  withBookRemoved,
  withOrphan,
  withTagToggled,
  withText,
} from './sample-holdings';

describe('the sample holdings', () => {
  it('moves a book to the removed records and back', () => {
    const removed = withBookRemoved(SAMPLE_HOLDINGS, LANTERNS.id, true);

    expect(isRemoved(removed, LANTERNS.id)).toBe(true);
    expect(removed.books.map((book) => book.id)).not.toContain(LANTERNS.id);
    expect(bookTitle(removed, LANTERNS.id)).toBe(LANTERNS.title);

    const back = withBookRemoved(removed, LANTERNS.id, false);
    expect(isRemoved(back, LANTERNS.id)).toBe(false);
    expect(back.books.map((book) => book.id)).toContain(LANTERNS.id);
  });

  it('adds and takes away the capture whose book is gone', () => {
    const added = withOrphan(SAMPLE_HOLDINGS, true);

    expect(hasOrphan(added)).toBe(true);
    expect(bookTitle(added, ORPHAN.bookId)).toBeNull();
    expect(hasOrphan(withOrphan(added, false))).toBe(false);
  });

  it('records an edit time only when the text changes', () => {
    const same = withText(SAMPLE_HOLDINGS, HARBOR_FIRST.id, ' 港の灯り ', sampleTime(90));
    const edited = withText(SAMPLE_HOLDINGS, HARBOR_FIRST.id, '港の明かり', sampleTime(90));

    expect(same).toEqual(SAMPLE_HOLDINGS);
    expect(edited.captures[0]).toMatchObject({ text: '港の明かり', editedAt: sampleTime(90) });
  });

  it('toggles a tag on a capture', () => {
    const untagged = withTagToggled(SAMPLE_HOLDINGS, HARBOR_FIRST.id, VOCAB.id);

    expect(untagged.captures[0]?.tagIds).toEqual([]);
    expect(withTagToggled(untagged, HARBOR_FIRST.id, VOCAB.id).captures[0]?.tagIds).toEqual([
      VOCAB.id,
    ]);
  });

  it('reads the stored row with a pixel rect as unreadable', () => {
    expect(PIXEL_RECT_ROWS).toHaveLength(1);
    expect(PIXEL_RECT_ROWS[0]?.stored.text).toBe('雨の音');
  });

  it('writes the unreadable section only when it holds a row', () => {
    const clean = buildCapturesFile(fileContents(SAMPLE_HOLDINGS, 1, '1.0.0')).file;
    const kept = buildCapturesFile(fileContents(SAMPLE_HOLDINGS, 1, '1.0.0', PIXEL_RECT_ROWS)).file;

    expect(clean.unreadable).toBeUndefined();
    expect(kept.unreadable).toEqual({
      books: [],
      tags: [],
      captures: [PIXEL_RECT_ROWS[0]?.stored],
    });
    expect(kept.captures).toEqual(clean.captures);
  });
});
