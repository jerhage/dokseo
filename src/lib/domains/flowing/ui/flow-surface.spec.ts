import { describe, expect, it } from 'vitest';
import type { TextQuote } from '$lib/shared/anchor';
import {
  goToPassage,
  markPassages,
  navigate,
  openAt,
  redrawPassages,
  tearDown,
} from './flow-surface';
import type { FlowTarget } from './flow-surface';
import type { Spine } from './flow-spine';
import { ARRIVED_AT_THE_CFI, FOUND_BY_ITS_TEXT, THE_PASSAGE_IS_LOST } from './flow-quote';

const SOMEWHERE = 'epubcfi(/6/14!/4/2/14/1:0)';

const FIRST_SECTION = 0;

type Stage = {
  readonly targets: FlowTarget[];
  readonly goTo: (target: FlowTarget) => Promise<unknown>;
  readonly resolveNavigation: (target: FlowTarget) => { index: number } | undefined;
};

type StageOptions = {
  readonly refuses?: readonly FlowTarget[];
  readonly at?: Readonly<Record<string, number>>;
  readonly unresolvable?: readonly FlowTarget[];
};

function everySectionHasABody(sections: number): Spine {
  return { sections, withoutABody: [] };
}

function stage(options: StageOptions = {}): Stage {
  const targets: FlowTarget[] = [];
  const refuses = options.refuses ?? [];
  const at = options.at ?? {};
  const unresolvable = options.unresolvable ?? [];

  return {
    targets,
    goTo: (target) => {
      targets.push(target);
      return Promise.resolve(refuses.includes(target) ? undefined : { index: 0 });
    },
    resolveNavigation: (target) => {
      if (unresolvable.includes(target)) return undefined;
      if (typeof target === 'number') return { index: target };
      if (typeof target === 'string') return { index: at[target] ?? 0 };

      return { index: 0 };
    },
  };
}

describe('openAt', () => {
  it('lays the book out at the cfi the reader stopped at', async () => {
    const view = stage();

    await expect(openAt(view, everySectionHasABody(3), SOMEWHERE)).resolves.toBe(true);
    expect(view.targets).toEqual([SOMEWHERE]);
  });

  it('opens the first section when no cfi was stored', async () => {
    const view = stage();

    await expect(openAt(view, everySectionHasABody(3), null)).resolves.toBe(true);
    expect(view.targets).toEqual([FIRST_SECTION]);
  });

  it('falls back to the first section when the stored cfi no longer resolves', async () => {
    const view = stage({ refuses: [SOMEWHERE] });

    await expect(openAt(view, everySectionHasABody(3), SOMEWHERE)).resolves.toBe(true);
    expect(view.targets).toEqual([SOMEWHERE, FIRST_SECTION]);
  });

  it('reports a failure when even the first section will not lay out', async () => {
    const view = stage({ refuses: [SOMEWHERE, FIRST_SECTION] });

    await expect(openAt(view, everySectionHasABody(3), SOMEWHERE)).resolves.toBe(false);
  });

  it('opens past a cover the paginator has no body element to lay out', async () => {
    const view = stage();

    await expect(openAt(view, { sections: 3, withoutABody: [0] }, null)).resolves.toBe(true);
    expect(view.targets).toEqual([1]);
  });

  it('opens past the two opening sections that have no body element', async () => {
    const view = stage();

    await expect(openAt(view, { sections: 4, withoutABody: [0, 1] }, null)).resolves.toBe(true);
    expect(view.targets).toEqual([2]);
  });

  it('moves a stored place out of a section that has no body element', async () => {
    const view = stage({ at: { [SOMEWHERE]: 2 } });

    await expect(openAt(view, { sections: 4, withoutABody: [2] }, SOMEWHERE)).resolves.toBe(true);
    expect(view.targets).toEqual([3]);
  });

  it('keeps a stored place whose own section has a body element', async () => {
    const view = stage({ at: { [SOMEWHERE]: 2 } });

    await expect(openAt(view, { sections: 4, withoutABody: [0] }, SOMEWHERE)).resolves.toBe(true);
    expect(view.targets).toEqual([SOMEWHERE]);
  });

  it('reports a failure when no section in the book has a body element', async () => {
    const view = stage();

    await expect(openAt(view, { sections: 2, withoutABody: [0, 1] }, null)).resolves.toBe(false);
    expect(view.targets).toEqual([]);
  });
});

describe('navigate', () => {
  it('hands a target foliate cannot resolve to foliate, which reports it', async () => {
    const view = stage({ unresolvable: ['nowhere.xhtml'] });

    await navigate(view, { sections: 3, withoutABody: [0] }, 'nowhere.xhtml');

    expect(view.targets).toEqual(['nowhere.xhtml']);
  });

  it('sends a contents entry pointing at a section with no body to the next one', async () => {
    const view = stage({ at: { 'cover.svg': 0 } });

    await navigate(view, { sections: 3, withoutABody: [0] }, 'cover.svg');

    expect(view.targets).toEqual([1]);
  });

  it('sends a scrubbed fraction landing on a section with no body to the next one', async () => {
    const view = stage();

    await navigate(view, { sections: 3, withoutABody: [0] }, { fraction: 0 });

    expect(view.targets).toEqual([1]);
  });
});

describe('tearDown', () => {
  it('destroys the book and removes the view although closing the renderer throws', () => {
    const done: string[] = [];
    const view = {
      close: () => {
        throw new Error('parameter 1 is not of type Element');
      },
      remove: () => {
        done.push('remove');
      },
    };
    const book = {
      destroy: () => {
        done.push('destroy');
      },
    };

    tearDown(view, book);

    expect(done).toEqual(['destroy', 'remove']);
  });

  it('removes the view although destroying the book throws', () => {
    const done: string[] = [];
    const view = {
      close: () => {
        done.push('close');
      },
      remove: () => {
        done.push('remove');
      },
    };
    const book = {
      destroy: () => {
        throw new Error('nothing to revoke');
      },
    };

    tearDown(view, book);

    expect(done).toEqual(['close', 'remove']);
  });

  it('closes the renderer, destroys the book and removes the view in that order', () => {
    const done: string[] = [];
    const view = {
      close: () => {
        done.push('close');
      },
      remove: () => {
        done.push('remove');
      },
    };
    const book = {
      destroy: () => {
        done.push('destroy');
      },
    };

    tearDown(view, book);

    expect(done).toEqual(['close', 'destroy', 'remove']);
  });
});

describe('goToPassage', () => {
  const QUOTE: TextQuote = {
    exact: '厳重に鍵',
    prefix: 'その病室は、外から',
    suffix: 'がかけられて',
  };

  const REFOUND = 'epubcfi(/6/14!/4/2/16/1:4)';

  function passage(): { cfi: string; quote: TextQuote } {
    return { cfi: SOMEWHERE, quote: QUOTE };
  }

  function never(): Promise<string | null> {
    throw new Error('the quote was asked for although the cfi resolved');
  }

  it('goes to the stored cfi while it still resolves', async () => {
    const view = stage();

    await expect(goToPassage(view, everySectionHasABody(3), never, passage())).resolves.toEqual(
      ARRIVED_AT_THE_CFI,
    );
    expect(view.targets).toEqual([SOMEWHERE]);
  });

  it('re-finds the passage by its text when the stored cfi no longer resolves', async () => {
    const view = stage({ refuses: [SOMEWHERE] });
    const asked: TextQuote[] = [];

    const arrival = await goToPassage(
      view,
      everySectionHasABody(3),
      (quote) => {
        asked.push(quote);
        return Promise.resolve(REFOUND);
      },
      passage(),
    );

    expect(arrival).toEqual(FOUND_BY_ITS_TEXT);
    expect(asked).toEqual([QUOTE]);
    expect(view.targets).toEqual([SOMEWHERE, REFOUND]);
  });

  it('reports the passage lost when its text is nowhere in the book', async () => {
    const view = stage({ refuses: [SOMEWHERE] });

    const arrival = await goToPassage(
      view,
      everySectionHasABody(3),
      () => Promise.resolve(null),
      passage(),
    );

    expect(arrival).toEqual(THE_PASSAGE_IS_LOST);
    expect(view.targets).toEqual([SOMEWHERE]);
  });

  it('reports the passage lost when the re-found cfi will not lay out either', async () => {
    const view = stage({ refuses: [SOMEWHERE, REFOUND] });

    const arrival = await goToPassage(
      view,
      everySectionHasABody(3),
      () => Promise.resolve(REFOUND),
      passage(),
    );

    expect(arrival).toEqual(THE_PASSAGE_IS_LOST);
    expect(view.targets).toEqual([SOMEWHERE, REFOUND]);
  });
});

type Drawn = {
  readonly added: string[];
  readonly deleted: string[];
  readonly addAnnotation: (annotation: { readonly value: string }) => Promise<unknown>;
  readonly deleteAnnotation: (annotation: { readonly value: string }) => Promise<unknown>;
};

function overlay(refuses: readonly string[] = []): Drawn {
  const added: string[] = [];
  const deleted: string[] = [];

  return {
    added,
    deleted,
    addAnnotation: (annotation) => {
      added.push(annotation.value);
      return refuses.includes(annotation.value)
        ? Promise.reject(new Error('that cfi no longer resolves'))
        : Promise.resolve({ index: 0, label: '' });
    },
    deleteAnnotation: (annotation) => {
      deleted.push(annotation.value);
      return Promise.resolve(undefined);
    },
  };
}

const ANOTHER_PASSAGE = 'epubcfi(/6/18!/4/2/8/1:30)';

describe('markPassages', () => {
  it('draws a passage the reader has just captured', () => {
    const view = overlay();
    const shown = new Set<string>();

    markPassages(view, shown, [SOMEWHERE]);

    expect(view.added).toEqual([SOMEWHERE]);
    expect(shown).toEqual(new Set([SOMEWHERE]));
  });

  it('draws nothing twice when the captures have not changed', () => {
    const view = overlay();
    const shown = new Set<string>();

    markPassages(view, shown, [SOMEWHERE]);
    markPassages(view, shown, [SOMEWHERE]);

    expect(view.added).toEqual([SOMEWHERE]);
  });

  it('takes the highlight away when its capture is deleted', () => {
    const view = overlay();
    const shown = new Set([SOMEWHERE]);

    markPassages(view, shown, []);

    expect(view.deleted).toEqual([SOMEWHERE]);
    expect(shown).toEqual(new Set());
  });

  it('keeps a passage whose cfi refuses to resolve, and reports nothing', async () => {
    const view = overlay([SOMEWHERE]);
    const shown = new Set<string>();

    markPassages(view, shown, [SOMEWHERE]);
    await new Promise((settled) => setTimeout(settled, 0));

    expect(view.added).toEqual([SOMEWHERE]);
    expect(shown).toEqual(new Set([SOMEWHERE]));
  });
});

describe('redrawPassages', () => {
  it('draws every highlight again when a chapter is laid out afresh', () => {
    const view = overlay();

    redrawPassages(view, new Set([SOMEWHERE, ANOTHER_PASSAGE]));

    expect(view.added).toEqual([SOMEWHERE, ANOTHER_PASSAGE]);
  });
});
