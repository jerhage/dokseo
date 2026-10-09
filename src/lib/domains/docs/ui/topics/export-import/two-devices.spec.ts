import { describe, expect, it } from 'vitest';
import { HARBOR_FIRST, HARBOR_SECOND, LANTERNS, LANTERN_FIRST } from './sample-holdings';
import { LAPTOP_HARBOR, LAPTOP_ONLY, TwoDevicesView, captureOf } from './two-devices.svelte';

function minted(): () => string {
  let count = 0;
  return () => {
    count += 1;
    return `minted-${count}`;
  };
}

function plannedState(view: TwoDevicesView) {
  const state = view.importing?.state;
  if (state?.kind !== 'preview') {
    throw new Error(`no plan: ${state?.kind}`);
  }
  return state;
}

describe('TwoDevicesView', () => {
  it('previews the phone file on the laptop as new, identical and held captures', async () => {
    const view = new TwoDevicesView(minted());

    await view.send('phone');

    expect(view.transfer?.to).toBe('laptop');
    expect(plannedState(view).plan.summary).toMatchObject({
      added: 2,
      identical: 1,
      conflicts: 0,
      notOnThisDevice: { books: 1, captures: 1 },
      newTags: 1,
    });
    expect(view.laptop.writes).toBe(0);
  });

  it('holds a capture of a book the laptop lacks under a new removed-book record', async () => {
    const view = new TwoDevicesView(minted());

    await view.send('phone');
    await view.importNow();

    expect(view.importing?.state).toEqual({
      kind: 'imported',
      counts: { added: 2, updated: 0, kept: 0, held: 1, tagsCreated: 1 },
    });
    expect(view.laptop.holdings.removedBooks.map((book) => [book.id, book.title])).toEqual([
      ['minted-1', LANTERNS.title],
    ]);
    expect(captureOf(view.laptop.holdings, LANTERN_FIRST.id)?.bookId).toBe('minted-1');
    expect(captureOf(view.laptop.holdings, HARBOR_SECOND.id)?.bookId).toBe(LAPTOP_HARBOR.id);
    expect(view.writesThisImport).toBe(4);
  });

  it('writes nothing when the same file is imported a second time', async () => {
    const view = new TwoDevicesView(minted());
    await view.send('phone');
    await view.importNow();
    const after = view.laptop.holdings;

    await view.importAgain();
    expect(plannedState(view).plan.summary).toMatchObject({ added: 0, newTags: 0, identical: 3 });
    await view.importNow();

    expect(view.writesThisImport).toBe(0);
    expect(view.laptop.holdings).toEqual(after);
  });

  it('keeps the newer edit of a capture edited on both devices', async () => {
    const view = new TwoDevicesView(minted());
    view.edit('phone', HARBOR_FIRST.id, '港の明かり');
    view.edit('laptop', HARBOR_FIRST.id, '港のあかり');

    await view.send('phone');
    expect(plannedState(view).plan.summary.conflicts).toBe(1);
    await view.importNow();

    expect(captureOf(view.laptop.holdings, HARBOR_FIRST.id)?.text).toBe('港のあかり');
  });

  it("keeps this device's version when both edits have the same time", async () => {
    const view = new TwoDevicesView(minted());
    view.freeze(true);
    view.edit('laptop', HARBOR_FIRST.id, '港のあかり');
    view.edit('phone', HARBOR_FIRST.id, '港の明かり');

    await view.send('laptop');
    await view.importNow();

    expect(captureOf(view.phone.holdings, HARBOR_FIRST.id)?.text).toBe('港の明かり');
  });

  it("takes the file's version when the review picks the file", async () => {
    const view = new TwoDevicesView(minted());
    view.edit('laptop', HARBOR_FIRST.id, '港のあかり');
    view.edit('phone', HARBOR_FIRST.id, '港の明かり');

    await view.send('laptop');
    view.review.pickStrategy('review');
    view.review.pick(HARBOR_FIRST.id, 'file');
    await view.importNow();

    expect(captureOf(view.phone.holdings, HARBOR_FIRST.id)?.text).toBe('港のあかり');
  });

  it('adds the laptop-only capture to the phone', async () => {
    const view = new TwoDevicesView(minted());

    await view.send('laptop');
    await view.importNow();

    expect(captureOf(view.phone.holdings, LAPTOP_ONLY.id)?.text).toBe(LAPTOP_ONLY.text);
  });
});
