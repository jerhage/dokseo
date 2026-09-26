import type { Snippet } from 'svelte';
import type { SVGAttributes } from 'svelte/elements';

type IconElement = 'circle' | 'ellipse' | 'g' | 'line' | 'path' | 'polygon' | 'polyline' | 'rect';

type IconNode = readonly (readonly [IconElement, Readonly<Record<string, string>>])[];

type IconProps = Omit<SVGAttributes<SVGSVGElement>, 'children'> & {
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
  nonScalingStroke?: boolean;
  children?: Snippet;
};

type IconStroke = {
  readonly width: number | string;
  readonly fixed: boolean;
};

const ICON_GRID = 24;

const DEFAULT_STROKE_WIDTH = 2;

function iconStroke(
  strokeWidth: number | string | undefined,
  absolute: boolean,
  size: number | string,
): IconStroke {
  const given = strokeWidth ?? DEFAULT_STROKE_WIDTH;
  const width = absolute ? (Number(given) * ICON_GRID) / Number(size) : given;
  return { width, fixed: strokeWidth !== undefined || absolute };
}

function isDecorative(attributes: Readonly<Record<string, unknown>>, labelled: boolean): boolean {
  if (labelled) return false;
  return !Object.keys(attributes).some(
    (name) => name.startsWith('aria-') || name === 'role' || name === 'title',
  );
}

export { DEFAULT_STROKE_WIDTH, ICON_GRID, iconStroke, isDecorative };
export type { IconElement, IconNode, IconProps, IconStroke };
