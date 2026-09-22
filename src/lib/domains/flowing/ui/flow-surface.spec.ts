import { describe, expect, it } from 'vitest';
import { openAt } from './flow-surface';

const SOMEWHERE = 'epubcfi(/6/14!/4/2/14/1:0)';

const FIRST_SECTION = 0;

type Stage = {
  readonly targets: (number | string)[];
  readonly goTo: (target: number | string) => Promise<unknown>;
};

function stage(refuses: readonly (number | string)[]): Stage {
  const targets: (number | string)[] = [];

  return {
    targets,
    goTo: (target) => {
      targets.push(target);
      return Promise.resolve(refuses.includes(target) ? undefined : { index: 0 });
    },
  };
}

describe('openAt', () => {
  it('lays the book out at the cfi the reader stopped at', async () => {
    const view = stage([]);

    await expect(openAt(view, SOMEWHERE)).resolves.toBe(true);
    expect(view.targets).toEqual([SOMEWHERE]);
  });

  it('opens the first section when no cfi was stored', async () => {
    const view = stage([]);

    await expect(openAt(view, null)).resolves.toBe(true);
    expect(view.targets).toEqual([FIRST_SECTION]);
  });

  it('falls back to the first section when the stored cfi no longer resolves', async () => {
    const view = stage([SOMEWHERE]);

    await expect(openAt(view, SOMEWHERE)).resolves.toBe(true);
    expect(view.targets).toEqual([SOMEWHERE, FIRST_SECTION]);
  });

  it('reports a failure when even the first section will not lay out', async () => {
    const view = stage([SOMEWHERE, FIRST_SECTION]);

    await expect(openAt(view, SOMEWHERE)).resolves.toBe(false);
  });
});
