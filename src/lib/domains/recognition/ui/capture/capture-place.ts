import type { Anchor } from '$lib/shared/anchor';
import type { ImageIndex } from '$lib/shared/ids';

const NO_PLACE = 'no page';

function pageLabel(index: ImageIndex): string {
  return String(index + 1).padStart(3, '0');
}

function placeLabel(anchor: Anchor): string {
  if (anchor.kind === 'text') return NO_PLACE;

  const regions = anchor.regions;
  const first = regions[0];
  const last = regions.at(-1);
  if (first === undefined || last === undefined) return NO_PLACE;

  const span =
    first.index === last.index
      ? `p.${pageLabel(first.index)}`
      : `p.${pageLabel(first.index)}–${pageLabel(last.index)}`;

  return regions.length > 1 ? `${span} · ${regions.length} regions` : span;
}

function firstImage(anchor: Anchor): ImageIndex | null {
  if (anchor.kind === 'text') return null;

  return anchor.regions[0]?.index ?? null;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function capturedLabel(createdAt: number, now: number): string | null {
  if (!Number.isFinite(createdAt) || createdAt <= 0) return null;

  const since = Math.max(0, now - createdAt);
  if (since < MINUTE) return 'captured just now';
  if (since < HOUR) return `captured ${Math.floor(since / MINUTE)} min ago`;

  const hours = Math.floor(since / HOUR);
  if (since < DAY) return `captured ${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(since / DAY);
  return `captured ${days} day${days === 1 ? '' : 's'} ago`;
}

export { NO_PLACE, pageLabel, placeLabel, firstImage, capturedLabel };
