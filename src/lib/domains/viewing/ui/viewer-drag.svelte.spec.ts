import { afterEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { imageIndex } from '$lib/shared/ids';
import type { ImageIndex } from '$lib/shared/ids';
import type { PagePicture } from '$lib/shared/page-source';
import ContinuousViewer from './ContinuousViewer.svelte';
import PagedViewer from './PagedViewer.svelte';

const PAGE_WIDTH = 400;

const PAGE_HEIGHT = 600;

const FRAME_WIDTH = 800;

const FRAME_HEIGHT = 600;

const DRAG_PX = 80;

type Point = { readonly x: number; readonly y: number };

function holdPointer(): void {
  vi.spyOn(Element.prototype, 'setPointerCapture').mockImplementation(() => undefined);
  vi.spyOn(Element.prototype, 'releasePointerCapture').mockImplementation(() => undefined);
  vi.spyOn(Element.prototype, 'hasPointerCapture').mockReturnValue(false);
}

async function pictureAt(): Promise<PagePicture> {
  const bitmap = await createImageBitmap(new ImageData(PAGE_WIDTH, PAGE_HEIGHT));
  return { kind: 'drawn', bitmap };
}

function sized(container: HTMLElement): void {
  container.style.display = 'flex';
  container.style.width = `${FRAME_WIDTH}px`;
  container.style.height = `${FRAME_HEIGHT}px`;
}

function at(type: string, point: Point, buttons: number): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: point.x,
    clientY: point.y,
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
    button: 0,
    buttons,
  });
}

function drag(target: Element, from: Point, to: Point): void {
  target.dispatchEvent(at('pointerdown', from, 1));
  target.dispatchEvent(at('pointermove', to, 1));
  target.dispatchEvent(at('pointerup', to, 0));
}

async function drawnPage(container: HTMLElement): Promise<HTMLCanvasElement> {
  return await vi.waitFor(() => {
    const canvas = container.querySelector<HTMLCanvasElement>('canvas[data-image-index]');
    if (canvas === null) throw new Error('The viewer rendered no page canvas');

    const box = canvas.getBoundingClientRect();
    if (canvas.width === 0 || box.width === 0 || box.height === 0) {
      throw new Error('The page has not been drawn yet');
    }

    return canvas;
  });
}

function acrossThePage(canvas: HTMLCanvasElement): readonly [Point, Point] {
  const box = canvas.getBoundingClientRect();
  const from = { x: box.left + box.width / 4, y: box.top + box.height / 4 };

  return [from, { x: from.x + DRAG_PX, y: from.y + DRAG_PX }];
}

afterEach(() => {
  vi.restoreAllMocks();
});

test('reports a finished drag in a spread as a selection and never as a tap', async () => {
  holdPointer();
  const select = vi.fn();
  const onTap = vi.fn();
  const { container } = await render(PagedViewer, {
    props: {
      pages: [imageIndex(0)],
      direction: 'rtl' as const,
      pageFit: 'height' as const,
      pictureAt,
      measured: (_index: ImageIndex) => undefined,
      chromeShown: false,
      select,
      clear: () => undefined,
      onTap,
      onFit: () => undefined,
    },
  });
  sized(container);

  const canvas = await drawnPage(container);
  const [from, to] = acrossThePage(canvas);
  drag(canvas, from, to);

  expect(select).toHaveBeenCalledTimes(1);
  expect(onTap).not.toHaveBeenCalled();
});

test('reports a finished mouse drag in a strip as a selection and never as a tap', async () => {
  holdPointer();
  const select = vi.fn();
  const onTap = vi.fn();
  const { container } = await render(ContinuousViewer, {
    props: {
      sizes: [{ width: PAGE_WIDTH, height: PAGE_HEIGHT }],
      start: { index: imageIndex(0), offset: 0 },
      pictureAt,
      measured: (_index: ImageIndex) => undefined,
      moveTo: () => undefined,
      select,
      clear: () => undefined,
      onTap,
    },
  });
  sized(container);

  const canvas = await drawnPage(container);
  const [from, to] = acrossThePage(canvas);
  drag(canvas, from, to);

  expect(select).toHaveBeenCalledTimes(1);
  expect(onTap).not.toHaveBeenCalled();
});
