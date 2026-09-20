import { belongsToModel } from './model-cache';
import type { ModelFetch } from './model-load';

type PartialFile = {
  readonly url: string;
  readonly bytes: number;
};

type PartialReport = {
  readonly modelId: string;
  readonly files: number;
  readonly bytes: number;
};

const WEIGHTS_SUFFIX = '.onnx';

function partialName(url: string): string {
  return encodeURIComponent(url);
}

function urlOfPartial(name: string): string {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

function resumesModelWeights(fetched: ModelFetch, modelId: string): boolean {
  if (fetched.partial) return false;

  const path = fetched.url.split(/[?#]/)[0] ?? '';
  return path.endsWith(WEIGHTS_SUFFIX) && belongsToModel(path, modelId);
}

function partialsOfModel(files: readonly PartialFile[], modelId: string): readonly PartialFile[] {
  return files.filter((file) => belongsToModel(file.url, modelId));
}

function partialReportOf(files: readonly PartialFile[], modelId: string): PartialReport {
  const mine = partialsOfModel(files, modelId);
  return {
    modelId,
    files: mine.length,
    bytes: mine.reduce((total, file) => total + file.bytes, 0),
  };
}

function isPartlyDownloaded(report: PartialReport | null): boolean {
  return report !== null && report.bytes > 0;
}

export {
  partialName,
  urlOfPartial,
  resumesModelWeights,
  partialsOfModel,
  partialReportOf,
  isPartlyDownloaded,
};
export type { PartialFile, PartialReport };
