import { isAvailable } from '$lib/platform/opfs/directory';
import * as parts from '$lib/platform/opfs/partial-store';
import { describeCause } from '$lib/shared/cause';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import {
  partialName,
  partialReportOf,
  partialsOfModel,
  urlOfPartial,
} from '../../domain/model/model-partial';
import type { PartialFile, PartialReport } from '../../domain/model/model-partial';
import type { PartialDownloads, PartialError } from '../../domain/model/partial-downloads';

function unavailable(): Result<never, PartialError> {
  return err({ kind: 'partials-unavailable' });
}

function failed(cause: unknown): Result<never, PartialError> {
  return err({ kind: 'partials-failed', cause: describeCause(cause) });
}

async function everyPart(): Promise<readonly PartialFile[]> {
  const stored = await parts.entries();
  return stored.map((part) => ({ url: urlOfPartial(part.key), bytes: part.bytes }));
}

export function createPartialDownloads(): PartialDownloads {
  return {
    async measure(modelId: string): Promise<Result<PartialReport, PartialError>> {
      if (!isAvailable()) return unavailable();
      try {
        const report = partialReportOf(await everyPart(), modelId);
        return ok(report);
      } catch (cause) {
        return failed(cause);
      }
    },

    async discard(modelId: string): Promise<Result<PartialReport, PartialError>> {
      if (!isAvailable()) return unavailable();
      try {
        const mine = partialsOfModel(await everyPart(), modelId);
        for (const part of mine) await parts.remove(partialName(part.url));
        return ok(partialReportOf(mine, modelId));
      } catch (cause) {
        return failed(cause);
      }
    },
  };
}
