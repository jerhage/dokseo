import { describe, expect, it } from 'vitest';
import type { Container } from '$lib/container';
import { bookId } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import { err, ok } from '$lib/shared/result';
import type { FlowSurface } from './flow-surface';
import { FlowView } from './flow-view.svelte';
import type { ShowFlowBook } from './flow-view.svelte';

const NOVEL: BookId = bookId('one');

const SOURCE = new Blob(['PK'], { type: 'application/epub+zip' });

type Reads = Awaited<ReturnType<Container['library']['readSource']>>;

type SourceFailure = Extract<Reads, { readonly ok: false }>['error'];

function containerReading(read: () => Promise<Reads>): Container {
  return { library: { readSource: read } } as unknown as Container;
}

function held(): { readonly promise: Promise<void>; readonly release: () => void } {
  let release = (): void => undefined;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

type Shown = {
  readonly show: ShowFlowBook;
  readonly sources: Blob[];
  readonly destroyed: number[];
  gate: Promise<void> | null;
  failure: string | null;
};

function shows(): Shown {
  const sources: Blob[] = [];
  const destroyed: number[] = [];

  const world = {
    sources,
    destroyed,
    gate: null as Promise<void> | null,
    failure: null as string | null,
    show: (() => Promise.reject(new Error('not built'))) as ShowFlowBook,
  };

  world.show = async (source: Blob): Promise<FlowSurface> => {
    sources.push(source);
    const which = sources.length - 1;
    if (world.gate !== null) await world.gate;
    if (world.failure !== null) throw new Error(world.failure);
    return {
      destroy: () => {
        destroyed.push(which);
      },
    };
  };

  return world;
}

describe('FlowView', () => {
  it('reads the stored source and hands it to the surface', async () => {
    const asked: BookId[] = [];
    const surfaces = shows();
    const view = new FlowView(
      containerReading(() => {
        asked.push(NOVEL);
        return Promise.resolve(ok(SOURCE));
      }),
    );

    await view.open(NOVEL, surfaces.show);

    expect(asked).toEqual([NOVEL]);
    expect(surfaces.sources).toEqual([SOURCE]);
    expect(view.state).toEqual({ kind: 'ready' });
    expect(view.curtain).toEqual({ kind: 'none' });
  });

  it('waits behind an opening curtain while the book is opened', async () => {
    const surfaces = shows();
    const gate = held();
    surfaces.gate = gate.promise;
    const view = new FlowView(containerReading(() => Promise.resolve(ok(SOURCE))));

    const opening = view.open(NOVEL, surfaces.show);
    await Promise.resolve();
    await Promise.resolve();
    expect(view.curtain).toEqual({ kind: 'opening' });

    gate.release();
    await opening;
    expect(view.curtain).toEqual({ kind: 'none' });
  });

  it('reports a source that is no longer stored', async () => {
    const surfaces = shows();
    const view = new FlowView(
      containerReading(() => Promise.resolve(err<SourceFailure>({ kind: 'not-found', id: NOVEL }))),
    );

    await view.open(NOVEL, surfaces.show);

    expect(surfaces.sources).toEqual([]);
    expect(view.curtain).toEqual({
      kind: 'notice',
      message: 'That book is no longer stored on this device.',
    });
  });

  it('reports storage that the browser refuses', async () => {
    const view = new FlowView(
      containerReading(() => Promise.resolve(err<SourceFailure>({ kind: 'storage-unavailable' }))),
    );

    await view.open(NOVEL, shows().show);

    expect(view.curtain).toEqual({
      kind: 'notice',
      message: 'This browser blocks local storage, so that book cannot be read.',
    });
  });

  it('reports the cause when a read throws', async () => {
    const view = new FlowView(containerReading(() => Promise.reject(new Error('disk gone'))));

    await view.open(NOVEL, shows().show);

    expect(view.curtain).toEqual({
      kind: 'notice',
      message: 'That book could not be read: Error: disk gone',
    });
  });

  it('reports a book the renderer refuses rather than showing a blank page', async () => {
    const surfaces = shows();
    surfaces.failure = 'not a zip';
    const view = new FlowView(containerReading(() => Promise.resolve(ok(SOURCE))));

    await view.open(NOVEL, surfaces.show);

    expect(view.state).toEqual({
      kind: 'failed',
      message: 'This book could not be displayed: Error: not a zip',
    });
  });

  it('destroys the open surface when the viewer closes', async () => {
    const surfaces = shows();
    const view = new FlowView(containerReading(() => Promise.resolve(ok(SOURCE))));

    await view.open(NOVEL, surfaces.show);
    view.close();

    expect(surfaces.destroyed).toEqual([0]);
    expect(view.state).toEqual({ kind: 'idle' });
  });

  it('destroys the open surface before opening another book', async () => {
    const surfaces = shows();
    const view = new FlowView(containerReading(() => Promise.resolve(ok(SOURCE))));

    await view.open(NOVEL, surfaces.show);
    await view.open(bookId('two'), surfaces.show);

    expect(surfaces.destroyed).toEqual([0]);
    expect(view.state).toEqual({ kind: 'ready' });
  });

  it('destroys a surface that arrives after the viewer closed', async () => {
    const surfaces = shows();
    const gate = held();
    surfaces.gate = gate.promise;
    const view = new FlowView(containerReading(() => Promise.resolve(ok(SOURCE))));

    const opening = view.open(NOVEL, surfaces.show);
    await Promise.resolve();
    view.close();
    gate.release();
    await opening;

    expect(surfaces.destroyed).toEqual([0]);
    expect(view.state).toEqual({ kind: 'idle' });
  });

  it('leaves a closed viewer silent when a late read fails', async () => {
    const gate = held();
    const view = new FlowView(
      containerReading(async () => {
        await gate.promise;
        return err<SourceFailure>({ kind: 'storage-failed', cause: 'quota' });
      }),
    );

    const opening = view.open(NOVEL, shows().show);
    view.close();
    gate.release();
    await opening;

    expect(view.state).toEqual({ kind: 'idle' });
  });
});
