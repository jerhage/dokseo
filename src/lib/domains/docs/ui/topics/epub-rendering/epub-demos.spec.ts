import { describe, expect, it, vi } from 'vitest';
import type { CapturePassage, DemoChapter, DemoPassage, DemoSurface } from './flow-kit';
import { arrivalSummary, arrivalTone, captureNotice, Reanchor } from './reanchor.svelte';
import { burstSummary, TurnBurst } from './turn-burst.svelte';

const HOST = {} as HTMLElement;

const PASSAGE: DemoPassage = {
  cfi: 'epubcfi(/6/4!/4/12,/3:19,/3:45)',
  quote: { exact: 'その二つ', prefix: '手紙。', suffix: 'の言葉が' },
  chapter: '探している本',
};

function fakeSurface(overrides: Partial<DemoSurface> = {}): DemoSurface {
  return {
    pages: { prev: vi.fn(), next: vi.fn() },
    paging: { axis: 'vertical', mode: 'vertical-rl' },
    jump: vi.fn(),
    goToPassage: vi.fn(() =>
      Promise.resolve({ kind: 'quote' as const, cfi: 'epubcfi(/6/6!/4/2)' }),
    ),
    mark: vi.fn(),
    restyle: vi.fn(),
    destroy: vi.fn(),
    ...overrides,
  };
}

function fakeChapter(index: number): DemoChapter {
  return {
    doc: { getSelection: () => null } as unknown as Document,
    index,
    cfis: { getCFI: () => PASSAGE.cfi },
    titles: { getProgressOf: () => ({}) },
  };
}
describe('TurnBurst', () => {
  it('counts the turns that moved, with the spine position of each', async () => {
    const burst = new TurnBurst(() => Promise.resolve());
    let presses = 0;

    await burst.run(
      () => {
        presses += 1;
        if (presses === 1) burst.moved({ cfi: 'epubcfi(/6/2!/4/2)', cause: { kind: 'travel' } });
        if (presses === 2) burst.moved({ cfi: 'epubcfi(/6/2!/4/2)', cause: { kind: 'reflow' } });
        if (presses === 3) burst.moved({ cfi: 'epubcfi(/6/4!/4/2)', cause: { kind: 'travel' } });
      },
      { presses: 4, gap: 0, settle: 0 },
    );

    expect(burst.state).toEqual({ kind: 'done', pressed: 4, landed: [1, 2] });
    expect(burstSummary(burst.state)).toBe(
      '4 presses, 2 page turns. Spine positions after each turn: 1, 2.',
    );
  });

  it('ignores relocations outside a run', () => {
    const burst = new TurnBurst(() => Promise.resolve());

    burst.moved({ cfi: 'epubcfi(/6/2!/4/2)', cause: { kind: 'travel' } });

    expect(burstSummary(burst.state)).toBe('No presses yet.');
  });
});

describe('Reanchor', () => {
  async function opened(
    passage: CapturePassage,
    surface: DemoSurface = fakeSurface(),
  ): Promise<{ reanchor: Reanchor; surface: DemoSurface; bind: (chapter: DemoChapter) => void }> {
    let bind: (chapter: DemoChapter) => void = () => undefined;
    const reanchor = new Reanchor((_host, _opening, bound) => {
      bind = bound;
      return Promise.resolve(surface);
    }, passage);
    reanchor.stage.attach(HOST);
    await reanchor.restart();
    return { reanchor, surface, bind };
  }

  it('captures the selection of the chapter on screen', async () => {
    const { reanchor, bind } = await opened(() => PASSAGE);
    bind(fakeChapter(1));

    reanchor.captureSelection();

    expect(reanchor.state).toEqual({ kind: 'captured', passage: PASSAGE });
  });

  it('asks for a selection when nothing is selected', async () => {
    const { reanchor, bind } = await opened(() => null);
    bind(fakeChapter(1));

    reanchor.captureSelection();

    expect(reanchor.state).toEqual({ kind: 'reading' });
    expect(reanchor.notice).toBe(captureNotice({ kind: 'nothing-selected' }));
  });

  it('reopens the new edition and goes back to the passage through the surface', async () => {
    const { reanchor, surface, bind } = await opened(() => PASSAGE);
    bind(fakeChapter(1));
    reanchor.captureSelection();

    await reanchor.reissue('foreword');
    await reanchor.goBack();

    expect(surface.goToPassage).toHaveBeenCalledWith({ cfi: PASSAGE.cfi, quote: PASSAGE.quote });
    expect(surface.mark).toHaveBeenCalledWith(['epubcfi(/6/6!/4/2)'], {
      kind: 'arrived',
      cfi: 'epubcfi(/6/6!/4/2)',
      place: null,
    });
    expect(reanchor.state).toMatchObject({ kind: 'arrived', edition: 'foreword' });
  });

  it('marks nothing when the passage is lost', async () => {
    const surface = fakeSurface({ goToPassage: () => Promise.resolve({ kind: 'lost' as const }) });
    const { reanchor, bind } = await opened(() => PASSAGE, surface);
    bind(fakeChapter(1));
    reanchor.captureSelection();
    await reanchor.reissue('restructured');

    await reanchor.goBack();

    expect(surface.mark).not.toHaveBeenCalled();
    expect(reanchor.state).toMatchObject({ kind: 'arrived', arrival: { kind: 'lost' } });
  });
});

describe('arrivalSummary and arrivalTone', () => {
  it('describe each arrival', () => {
    const arrivals = [
      { kind: 'cfi' as const, cfi: 'a' },
      { kind: 'quote' as const, cfi: 'b' },
      { kind: 'lost' as const },
    ];

    expect(arrivals.map(arrivalTone)).toEqual(['info', 'warning', 'danger']);
    expect(new Set(arrivals.map(arrivalSummary)).size).toBe(3);
  });
});
