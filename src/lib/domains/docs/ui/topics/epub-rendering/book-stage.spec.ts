import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_READING_SETTINGS } from '$lib/domains/flowing/domain/reading-settings';
import { FIRST_EDITION } from '../../../domain/sample-epub';
import { BookStage, pagingLabel, stageNotice } from './book-stage.svelte';
import type { DemoOpening, DemoSurface, OpenFlow } from './flow-kit';

const HOST = {} as HTMLElement;

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

describe('BookStage', () => {
  it('opens the sample book on its host and reports the paging', async () => {
    const surface = fakeSurface();
    const open = vi.fn<OpenFlow>(() => Promise.resolve(surface));
    const stage = new BookStage(open);
    stage.attach(HOST);

    await stage.show(FIRST_EDITION, DEFAULT_READING_SETTINGS);

    expect(open).toHaveBeenCalledWith(HOST, expect.anything(), expect.any(Function));
    expect(open.mock.calls[0]?.[1].source.type).toBe('application/epub+zip');
    expect(stage.state).toEqual({ kind: 'open', paging: surface.paging });
  });

  it('destroys a surface that finishes opening after a newer show', async () => {
    const first = fakeSurface();
    const second = fakeSurface();
    let release: (surface: DemoSurface) => void = () => undefined;
    const open = vi
      .fn<OpenFlow>()
      .mockImplementationOnce(() => new Promise((resolve) => (release = resolve)))
      .mockImplementationOnce(() => Promise.resolve(second));
    const stage = new BookStage(open);
    stage.attach(HOST);

    const stale = stage.show(FIRST_EDITION, DEFAULT_READING_SETTINGS);
    await stage.show(FIRST_EDITION, DEFAULT_READING_SETTINGS);
    release(first);
    await stale;

    expect(first.destroy).toHaveBeenCalled();
    expect(stage.surface).toBe(second);
  });

  it('opens nothing before it has a host', async () => {
    const open = vi.fn<OpenFlow>();

    await new BookStage(open).show(FIRST_EDITION, DEFAULT_READING_SETTINGS);

    expect(open).not.toHaveBeenCalled();
  });

  it('names a failed open', async () => {
    const stage = new BookStage(() => Promise.reject(new Error('no body')));
    stage.attach(HOST);

    await stage.show(FIRST_EDITION, DEFAULT_READING_SETTINGS);

    expect(stageNotice(stage.state)).toBe('The sample book could not be shown: no body');
  });

  it('restyles the open surface with the latest ink', async () => {
    const surface = fakeSurface();
    const stage = new BookStage(() => Promise.resolve(surface));
    stage.attach(HOST);
    await stage.show(FIRST_EDITION, DEFAULT_READING_SETTINGS);
    const ink = {
      scheme: 'dark' as const,
      text: 'white',
      link: 'blue',
      selection: 'green',
      selectionText: 'white',
    };

    stage.paint(ink);

    expect(surface.restyle).toHaveBeenLastCalledWith(DEFAULT_READING_SETTINGS, ink);
  });

  it('drops relocations from a book it has closed', async () => {
    let moved: DemoOpening['moved'] = () => undefined;
    const stage = new BookStage((_host, opening) => {
      moved = opening.moved;
      return Promise.resolve(fakeSurface());
    });
    stage.attach(HOST);
    await stage.show(FIRST_EDITION, DEFAULT_READING_SETTINGS);
    stage.close();

    moved({ cfi: 'epubcfi(/6/2!/4)', cause: { kind: 'travel' } });

    expect(stage.location).toBeNull();
  });
});

describe('pagingLabel', () => {
  it('names each axis', () => {
    expect(pagingLabel({ axis: 'vertical', mode: 'vertical-rl' })).toBe(
      'vertical-rl, pages turn top to bottom',
    );
    expect(pagingLabel({ axis: 'horizontal', direction: 'ltr' })).toBe('horizontal, ltr columns');
  });
});
