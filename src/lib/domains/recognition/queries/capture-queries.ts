import { queryOptions } from '@tanstack/svelte-query';
import type { Result } from '$lib/shared/result';
import type { Capture } from '../domain/capture/capture';
import type { CaptureError } from '../domain/capture/capture-repository';
import { recognitionKeys } from './recognition-keys';
import { storeRead } from './store-read';

type CaptureReads = {
  readonly listEveryCapture: () => Promise<Result<readonly Capture[], CaptureError>>;
};

function everyCaptureQuery(recognition: CaptureReads) {
  return queryOptions({
    queryKey: recognitionKeys.everyCapture(),
    queryFn: async () => {
      const listed = await recognition.listEveryCapture();
      return storeRead(listed);
    },
    staleTime: 0,
  });
}

export { everyCaptureQuery };
export type { CaptureReads };
