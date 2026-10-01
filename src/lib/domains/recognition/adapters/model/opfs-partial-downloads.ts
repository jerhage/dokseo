import { isAvailable, isPrivateWindowRefusal } from '$lib/platform/opfs/directory';
import * as parts from '$lib/platform/opfs/partial-store';
import {
  partialName,
  partialReportOf,
  partialsOfModel,
  urlOfPartial,
} from '../../domain/model/model-partial';
import type { PartialFile } from '../../domain/model/model-partial';
import type { PartialDownloads, PartialsRead } from '../../domain/model/partial-downloads';

const PARTIALS_UNAVAILABLE: PartialsRead = { kind: 'partials-unavailable' };

async function everyPart(): Promise<readonly PartialFile[] | null> {
  try {
    const stored = await parts.entries();
    return stored.map((part) => ({ url: urlOfPartial(part.key), bytes: part.bytes }));
  } catch (cause) {
    if (isPrivateWindowRefusal(cause)) return null;
    throw cause;
  }
}

function createPartialDownloads(): PartialDownloads {
  return {
    async measure(modelId: string): Promise<PartialsRead> {
      if (!isAvailable()) return PARTIALS_UNAVAILABLE;
      const every = await everyPart();
      if (every === null) return PARTIALS_UNAVAILABLE;
      return { kind: 'success', report: partialReportOf(every, modelId) };
    },

    async discard(modelId: string): Promise<PartialsRead> {
      if (!isAvailable()) return PARTIALS_UNAVAILABLE;
      const every = await everyPart();
      if (every === null) return PARTIALS_UNAVAILABLE;
      const mine = partialsOfModel(every, modelId);
      for (const part of mine) await parts.remove(partialName(part.url));
      return { kind: 'success', report: partialReportOf(mine, modelId) };
    },
  };
}

export { createPartialDownloads };
