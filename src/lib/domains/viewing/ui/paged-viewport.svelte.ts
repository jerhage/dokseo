import { match } from 'ts-pattern';
import { SvelteMap } from 'svelte/reactivity';
import {
  canPan,
  centrePan,
  clampPan,
  doubleTapTarget,
  fitZoom,
  panBy,
  pinchStep,
  zoomAt,
} from '$lib/ui/components/pan-zoom';
import type { Pinch, Viewport, ZoomPoint } from '$lib/ui/components/pan-zoom';
import type { Size } from '$lib/shared/geometry';
import type { ImageIndex } from '$lib/shared/ids';
import type { PageFit } from '$lib/shared/page-fit';
import type { PanReach } from '../domain/overscroll';
import { FIT_HEIGHT_ZOOM, arrivalViewport, pageFitZoom } from '../domain/viewport';
import type { Framing, ViewportFit } from '../domain/viewport';
import type { ReaderGesture } from './gesture-hint';
import { learnGesture } from './learned-gestures.svelte';

type FrameBoxes = {
  readonly frame: Size;
  readonly strip: Size;
};

type FrameOffset = {
  readonly left: number;
  readonly top: number;
};

type ViewportFrame = {
  readonly boxes: () => FrameBoxes | null;
  readonly offset: () => FrameOffset | null;
};

type ViewportPane = {
  readonly key: ImageIndex;
  readonly beside: number;
};

const FITTED: Viewport = { zoom: FIT_HEIGHT_ZOOM, panX: 0, panY: 0 };

function createPagedViewport(
  frame: ViewportFrame,
  pageFit: () => PageFit,
  learn: (gesture: ReaderGesture) => void = learnGesture,
) {
  let viewport = $state.raw<Viewport>(FITTED);
  let fit = $state.raw<ViewportFit>(pageFit());
  let pannable = $state(false);
  let frameSize = $state.raw<Size | null>(null);
  const contents = new SvelteMap<ImageIndex, Size>();
  let panOrigin: Viewport = FITTED;

  function framesNow(): Framing | null {
    const zoom = viewport.zoom;
    const boxes = frame.boxes();
    if (boxes === null) return null;
    if (!Number.isFinite(zoom) || zoom <= 0) return null;

    return {
      frame: { width: boxes.frame.width, height: boxes.frame.height },
      content: { width: boxes.strip.width / zoom, height: boxes.strip.height / zoom },
    };
  }

  function framingOf(key: ImageIndex | undefined): Framing | null {
    const content = key === undefined ? undefined : contents.get(key);
    const outer = frameSize;
    return content === undefined || outer === null ? null : { content, frame: outer };
  }

  function framePoint(x: number, y: number): ZoomPoint | null {
    const offset = frame.offset();
    if (offset === null) return null;

    return { x: x - offset.left, y: y - offset.top };
  }

  function commit(next: Viewport, sizes: Framing | null): void {
    viewport = next;
    if (sizes !== null) pannable = canPan(sizes.content, sizes.frame, next.zoom);
  }

  function settle(next: Viewport): void {
    const sizes = framesNow();
    commit(sizes === null ? next : clampPan(next, sizes.content, sizes.frame), sizes);
  }

  function recentre(zoom: number): void {
    const sizes = framesNow();
    const next: Viewport = { zoom, panX: viewport.panX, panY: viewport.panY };
    commit(sizes === null ? next : centrePan(next, sizes.content, sizes.frame), sizes);
  }

  function zoomed(next: Viewport): void {
    fit = 'free';
    settle(next);
    if (pannable) learn('zoom-to-pan');
  }

  function fitHeight(): void {
    fit = 'height';
    recentre(FIT_HEIGHT_ZOOM);
  }

  function fitWidth(): void {
    const sizes = framesNow();
    fit = 'width';
    if (sizes === null) return;
    recentre(fitZoom(sizes.content, sizes.frame, 'width'));
  }

  function zoomAtPoint(factor: number, x: number, y: number): void {
    zoomed(zoomAt(viewport, factor, x, y));
  }

  return {
    get viewport(): Viewport {
      return viewport;
    },
    get fit(): ViewportFit {
      return fit;
    },
    get pannable(): boolean {
      return pannable;
    },
    framed(size: Size): void {
      frameSize = size;
    },
    measured(key: ImageIndex, size: Size): void {
      contents.set(key, size);
    },
    forget(key: ImageIndex): void {
      contents.delete(key);
    },
    paneViewport(pane: ViewportPane): Viewport {
      return pane.beside === 0 ? viewport : arrivalViewport(fit, viewport, framingOf(pane.key));
    },
    arrive(key: ImageIndex | undefined): void {
      const sizes = framingOf(key) ?? framesNow();
      commit(arrivalViewport(fit, viewport, sizes), sizes);
    },
    fitHeight,
    fitWidth,
    refit(): void {
      match(fit)
        .with('height', () => fitHeight())
        .with('width', () => fitWidth())
        .with('free', () => settle(viewport))
        .exhaustive();
    },
    panBy(dx: number, dy: number): void {
      settle(panBy(viewport, dx, dy));
    },
    zoomAt: zoomAtPoint,
    stepZoom(factor: number): void {
      const sizes = framesNow();
      if (sizes === null) return;

      zoomAtPoint(factor, sizes.frame.width / 2, sizes.frame.height / 2);
    },
    pinch(pinch: Pinch): void {
      const sizes = framesNow();
      const centre = framePoint(pinch.cx, pinch.cy);
      if (sizes === null || centre === null) return;

      zoomed(
        pinchStep(
          viewport,
          { ...pinch, cx: centre.x, cy: centre.y },
          {
            content: sizes.content,
            frame: sizes.frame,
            floor: pageFitZoom(pageFit(), sizes),
          },
        ),
      );
    },
    doubleTap(at: ZoomPoint): void {
      const sizes = framesNow();
      const point = framePoint(at.x, at.y);
      if (sizes === null || point === null) return;

      const wanted = pageFit();
      const target = doubleTapTarget(viewport, pageFitZoom(wanted, sizes), point);
      if (target.kind === 'zoom') {
        zoomed(target.viewport);
        return;
      }

      fit = wanted;
      settle(target.viewport);
    },
    holdPanOrigin(): void {
      panOrigin = viewport;
    },
    panReach(): PanReach | null {
      const sizes = framesNow();
      return sizes === null
        ? null
        : { origin: panOrigin, content: sizes.content, frame: sizes.frame };
    },
  };
}

export { createPagedViewport };
export type { FrameBoxes, FrameOffset, ViewportFrame, ViewportPane };
