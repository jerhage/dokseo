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

class PagedViewport {
  #frame: ViewportFrame;
  #pageFit: () => PageFit;
  #learn: (gesture: ReaderGesture) => void;
  #viewport = $state.raw<Viewport>(FITTED);
  #fit: ViewportFit;
  #pannable = $state(false);
  #frameSize = $state.raw<Size | null>(null);
  #contents = new SvelteMap<ImageIndex, Size>();
  #panOrigin: Viewport = FITTED;

  constructor(
    frame: ViewportFrame,
    pageFit: () => PageFit,
    learn: (gesture: ReaderGesture) => void = learnGesture,
  ) {
    this.#frame = frame;
    this.#pageFit = pageFit;
    this.#learn = learn;
    this.#fit = $state.raw(pageFit());
  }

  get viewport(): Viewport {
    return this.#viewport;
  }

  get fit(): ViewportFit {
    return this.#fit;
  }

  get pannable(): boolean {
    return this.#pannable;
  }

  framed(size: Size): void {
    this.#frameSize = size;
  }

  measured(key: ImageIndex, size: Size): void {
    this.#contents.set(key, size);
  }

  forget(key: ImageIndex): void {
    this.#contents.delete(key);
  }

  paneViewport(pane: ViewportPane): Viewport {
    return pane.beside === 0
      ? this.#viewport
      : arrivalViewport(this.#fit, this.#viewport, this.#framingOf(pane.key));
  }

  arrive(key: ImageIndex | undefined): void {
    const sizes = this.#framingOf(key) ?? this.#framesNow();
    this.#commit(arrivalViewport(this.#fit, this.#viewport, sizes), sizes);
  }

  fitHeight(): void {
    this.#fit = 'height';
    this.#recentre(FIT_HEIGHT_ZOOM);
  }

  fitWidth(): void {
    const sizes = this.#framesNow();
    this.#fit = 'width';
    if (sizes === null) return;
    this.#recentre(fitZoom(sizes.content, sizes.frame, 'width'));
  }

  refit(): void {
    match(this.#fit)
      .with('height', () => this.fitHeight())
      .with('width', () => this.fitWidth())
      .with('free', () => this.#settle(this.#viewport))
      .exhaustive();
  }

  panBy(dx: number, dy: number): void {
    this.#settle(panBy(this.#viewport, dx, dy));
  }

  zoomAt(factor: number, x: number, y: number): void {
    this.#zoomed(zoomAt(this.#viewport, factor, x, y));
  }

  stepZoom(factor: number): void {
    const sizes = this.#framesNow();
    if (sizes === null) return;

    this.zoomAt(factor, sizes.frame.width / 2, sizes.frame.height / 2);
  }

  pinch(pinch: Pinch): void {
    const sizes = this.#framesNow();
    const centre = this.#framePoint(pinch.cx, pinch.cy);
    if (sizes === null || centre === null) return;

    this.#zoomed(
      pinchStep(
        this.#viewport,
        { ...pinch, cx: centre.x, cy: centre.y },
        {
          content: sizes.content,
          frame: sizes.frame,
          floor: pageFitZoom(this.#pageFit(), sizes),
        },
      ),
    );
  }

  doubleTap(at: ZoomPoint): void {
    const sizes = this.#framesNow();
    const point = this.#framePoint(at.x, at.y);
    if (sizes === null || point === null) return;

    const pageFit = this.#pageFit();
    const target = doubleTapTarget(this.#viewport, pageFitZoom(pageFit, sizes), point);
    if (target.kind === 'zoom') {
      this.#zoomed(target.viewport);
      return;
    }

    this.#fit = pageFit;
    this.#settle(target.viewport);
  }

  holdPanOrigin(): void {
    this.#panOrigin = this.#viewport;
  }

  panReach(): PanReach | null {
    const sizes = this.#framesNow();
    return sizes === null
      ? null
      : { origin: this.#panOrigin, content: sizes.content, frame: sizes.frame };
  }

  #framesNow(): Framing | null {
    const zoom = this.#viewport.zoom;
    const boxes = this.#frame.boxes();
    if (boxes === null) return null;
    if (!Number.isFinite(zoom) || zoom <= 0) return null;

    return {
      frame: { width: boxes.frame.width, height: boxes.frame.height },
      content: { width: boxes.strip.width / zoom, height: boxes.strip.height / zoom },
    };
  }

  #framingOf(key: ImageIndex | undefined): Framing | null {
    const content = key === undefined ? undefined : this.#contents.get(key);
    const outer = this.#frameSize;
    return content === undefined || outer === null ? null : { content, frame: outer };
  }

  #framePoint(x: number, y: number): ZoomPoint | null {
    const offset = this.#frame.offset();
    if (offset === null) return null;

    return { x: x - offset.left, y: y - offset.top };
  }

  #commit(next: Viewport, sizes: Framing | null): void {
    this.#viewport = next;
    if (sizes !== null) this.#pannable = canPan(sizes.content, sizes.frame, next.zoom);
  }

  #settle(next: Viewport): void {
    const sizes = this.#framesNow();
    this.#commit(sizes === null ? next : clampPan(next, sizes.content, sizes.frame), sizes);
  }

  #recentre(zoom: number): void {
    const sizes = this.#framesNow();
    const next: Viewport = { zoom, panX: this.#viewport.panX, panY: this.#viewport.panY };
    this.#commit(sizes === null ? next : centrePan(next, sizes.content, sizes.frame), sizes);
  }

  #zoomed(next: Viewport): void {
    this.#fit = 'free';
    this.#settle(next);
    if (this.#pannable) this.#learn('zoom-to-pan');
  }
}

export { PagedViewport };
export type { FrameBoxes, FrameOffset, ViewportFrame, ViewportPane };
