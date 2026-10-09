import { match } from 'ts-pattern';
import type { Arrangement } from '$lib/shared/arrangement';
import type { ImageRegion } from '$lib/shared/image-region';
import type { Language } from '$lib/shared/language';
import type { PageSource } from '$lib/shared/page-source';
import { isPartlyStored, isStored } from '../../domain/model/model-cache';
import type { ModelLoad } from '../../domain/model/model-load';
import { isPartlyDownloaded } from '../../domain/model/model-partial';
import type { EngineState } from '../../domain/engine/ocr-engine';
import type { RecognizerSession } from '../../domain/engine/recognizer-session';
import type { ModelStorageSnapshot } from '../../use-cases/model/read-model-storage';

type PendingRecognition = {
  readonly source: PageSource;
  readonly language: Language;
  readonly regions: readonly ImageRegion[];
  readonly arrangement: Arrangement;
};

type EngineWarmth =
  | { readonly kind: 'unchecked' }
  | { readonly kind: 'missing' }
  | { readonly kind: 'partial' }
  | { readonly kind: 'stored' }
  | { readonly kind: 'opening' }
  | { readonly kind: 'failed'; readonly cause: string };

const UNCHECKED: EngineWarmth = { kind: 'unchecked' };

const STORED: EngineWarmth = { kind: 'stored' };

function warmthOf(snapshot: ModelStorageSnapshot | null): EngineWarmth {
  if (snapshot === null) return UNCHECKED;
  if (isStored(snapshot.report)) return STORED;
  if (isPartlyStored(snapshot.report) || isPartlyDownloaded(snapshot.partial)) {
    return { kind: 'partial' };
  }
  return { kind: 'missing' };
}

function engineStateOf(
  warmth: EngineWarmth,
  load: ModelLoad | null,
  session: RecognizerSession | null,
): EngineState {
  const quiet = {
    stored: false,
    opening: false,
    load,
    session,
    failure: null,
    paused: false,
    cancelled: false,
    partlyDownloaded: false,
  };

  return match(warmth)
    .with({ kind: 'unchecked' }, { kind: 'missing' }, () => quiet)
    .with({ kind: 'partial' }, () => ({ ...quiet, partlyDownloaded: true }))
    .with({ kind: 'stored' }, () => ({ ...quiet, stored: true }))
    .with({ kind: 'opening' }, () => ({ ...quiet, stored: true, opening: true }))
    .with({ kind: 'failed' }, (failed) => ({ ...quiet, stored: true, failure: failed.cause }))
    .exhaustive();
}

export { STORED, UNCHECKED, engineStateOf, warmthOf };
export type { EngineWarmth, PendingRecognition };
