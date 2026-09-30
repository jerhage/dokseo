import { match } from 'ts-pattern';
import { rememberedString } from '$lib/platform/storage/remembered-string';
import type { LocateStore } from '$lib/platform/storage/remembered-string';

type CaptureSort = 'book' | 'newest';

const CAPTURE_SORT_KEY = 'reader.captures.sort';

const CAPTURE_SORT_LABEL = 'Sort captures';

const CAPTURE_SORTS: readonly CaptureSort[] = ['book', 'newest'];

function captureSortName(sort: CaptureSort): string {
  return match(sort)
    .with('book', () => 'Book order')
    .with('newest', () => 'Newest first')
    .exhaustive();
}

function toCaptureSort(stored: string | null): CaptureSort {
  return CAPTURE_SORTS.find((sort) => sort === stored) ?? 'book';
}

function readCaptureSort(locate?: LocateStore): CaptureSort {
  return toCaptureSort(rememberedString(CAPTURE_SORT_KEY, locate).read());
}

function saveCaptureSort(sort: CaptureSort, locate?: LocateStore): void {
  rememberedString(CAPTURE_SORT_KEY, locate).write(sort);
}

export {
  CAPTURE_SORTS,
  CAPTURE_SORT_KEY,
  CAPTURE_SORT_LABEL,
  captureSortName,
  readCaptureSort,
  saveCaptureSort,
  toCaptureSort,
};
export type { CaptureSort };
