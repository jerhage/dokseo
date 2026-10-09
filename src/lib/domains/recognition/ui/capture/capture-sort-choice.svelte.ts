import type { LocateStore } from '$lib/platform/storage/remembered-string';
import { RememberedChoice } from '$lib/shared/remembered-choice.svelte';
import { readCaptureSort, saveCaptureSort } from './capture-sort';
import type { CaptureSort } from './capture-sort';

function createCaptureSort(locate?: LocateStore) {
  const chosen = new RememberedChoice<CaptureSort>(
    () => readCaptureSort(locate),
    (sort) => saveCaptureSort(sort, locate),
  );

  return {
    get sort(): CaptureSort {
      return chosen.value;
    },
    sortBy(sort: CaptureSort): void {
      chosen.choose(sort);
    },
  };
}

type CaptureSortHook = ReturnType<typeof createCaptureSort>;

export { createCaptureSort };
export type { CaptureSortHook };
