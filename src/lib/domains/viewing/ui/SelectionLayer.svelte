<script lang="ts">
  import { match } from 'ts-pattern';
  import MarqueeSelection from '$lib/ui/components/MarqueeSelection.svelte';
  import type {
    MarqueeEnd,
    MarqueeRect,
    MarqueeRefusal,
    MarqueeStroke,
  } from '$lib/ui/components/marquee-selection';
  import { beginTrace } from '$lib/platform/trace/pipeline-trace';
  import type { Trace } from '$lib/platform/trace/pipeline-trace';
  import type { Arrangement } from '$lib/shared/arrangement';
  import type { CaptureOrigin } from '$lib/shared/capture-origin';
  import { clickSlop } from '$lib/shared/click-slop';
  import { screenRect } from '$lib/shared/geometry';
  import type { Size } from '$lib/shared/geometry';
  import type { ImageRegion } from '$lib/shared/image-region';
  import { regionsIn } from '../domain/placement';
  import type { PlacedImage } from '../domain/placement';
  import { drawnSize, MIN_SELECTION_PX, sizeLabel } from '../domain/selection';
  import type { Point } from '../domain/selection';
  import { placedImages } from './page-placements';

  type Props = {
    readonly within: HTMLElement | null;
    readonly arrangement: Arrangement;
    readonly pointerTypes: 'any' | readonly string[];
    readonly makes?: CaptureOrigin;
    readonly suppressed?: boolean;
    readonly select: (regions: readonly ImageRegion[]) => void;
    readonly clear: () => void;
    readonly tap: (at: Point) => void;
  };

  let {
    within,
    arrangement,
    pointerTypes,
    makes = 'recognized',
    suppressed = false,
    select,
    clear,
    tap,
  }: Props = $props();

  let marquee = $state<ReturnType<typeof MarqueeSelection> | null>(null);
  let captured = $state.raw<Size | null>(null);

  const noting = $derived(makes === 'written');

  const measure = $derived(captured === null ? undefined : sizeLabel(captured));

  function placementsIn(element: HTMLElement, trace: Trace): readonly PlacedImage[] {
    const found = element.querySelectorAll('[data-image-index]');
    const placed = placedImages(found);

    trace.step('placements', { elements: found.length, placed: placed.length });
    for (const image of placed) {
      trace.step('placement', {
        index: image.index,
        naturalWidth: image.natural.width,
        naturalHeight: image.natural.height,
        onScreen: image.onScreen,
      });
    }

    return placed;
  }

  function drawn(selection: MarqueeRect): void {
    const surface = within;
    if (surface === null) return;

    const rect = screenRect(selection.x, selection.y, selection.width, selection.height);
    const placed = placedImages(surface.querySelectorAll('[data-image-index]'));
    captured = drawnSize(placed, rect, arrangement);
  }

  function forget(): void {
    captured = null;
    clear();
  }

  function ended(end: MarqueeEnd, stroke: MarqueeStroke): void {
    const trace = beginTrace('selection');
    try {
      trace.step('pointer', { from: stroke.from, to: stroke.to, kind: end.kind });

      match(end)
        .with({ kind: 'click' }, () => undefined)
        .with({ kind: 'too-small' }, ({ selection }) => {
          trace.step('stopped', {
            guard: 'below-minimum',
            width: selection.width,
            height: selection.height,
            minimum: MIN_SELECTION_PX,
          });
        })
        .with({ kind: 'selection' }, ({ selection }) => {
          const rect = screenRect(selection.x, selection.y, selection.width, selection.height);
          const placed = placementsIn(stroke.surface, trace);
          const regions = regionsIn(placed, rect);
          trace.step('regions', { count: regions.length });
          for (const region of regions) {
            trace.step('region', { index: region.index, rect: region.rect });
          }
          if (regions.length === 0) {
            trace.step('stopped', { guard: 'no-regions' });
            return;
          }

          marquee?.keep(selection);
          captured = drawnSize(placed, rect, arrangement);
          trace.step('selected', { regions: regions.length, size: captured });
          select(regions);
        })
        .exhaustive();
    } finally {
      trace.end();
    }
  }

  function refused(refusal: MarqueeRefusal): void {
    const trace = beginTrace('selection');
    try {
      match(refusal)
        .with({ kind: 'pointer-mismatch' }, ({ held, released }) => {
          trace.step('stopped', { guard: 'pointer-mismatch', held, released });
        })
        .with({ kind: 'no-drag-origin' }, ({ hasSurface, hasAnchor }) => {
          trace.step('stopped', { guard: 'no-drag-origin', hasWithin: hasSurface, hasAnchor });
        })
        .exhaustive();
    } finally {
      trace.end();
    }
  }

  export function dragging(): boolean {
    return marquee?.dragging() ?? false;
  }

  export function followScroll(by: Point): void {
    marquee?.followScroll(by);
  }

  export function reset(): void {
    marquee?.reset();
    captured = null;
  }

  export function dismiss(): void {
    marquee?.dismiss();
  }

  export function pointerdown(event: PointerEvent): void {
    marquee?.pointerdown(event);
  }

  export function pointermove(event: PointerEvent): void {
    marquee?.pointermove(event);
  }

  export function pointerup(event: PointerEvent): void {
    marquee?.pointerup(event);
  }

  export function pointercancel(event: PointerEvent): void {
    marquee?.pointercancel(event);
  }

  export function beginAt(id: number, from: Point, to: Point): void {
    marquee?.beginAt(id, from, to);
  }

  export function extendTo(at: Point): void {
    marquee?.extendTo(at);
  }

  export function endAt(at: Point): void {
    marquee?.endAt(at);
  }

  export function abandon(): void {
    marquee?.abandon();
  }
</script>

<MarqueeSelection
  bind:this={marquee}
  {within}
  {pointerTypes}
  {suppressed}
  slop={clickSlop}
  minimum={MIN_SELECTION_PX}
  accent={noting}
  label={measure}
  onstart={forget}
  ondraw={drawn}
  onend={ended}
  onrefuse={refused}
  onclick={tap}
  ondismiss={forget}
/>
