import { match, P } from 'ts-pattern';
import type { Language } from '$lib/shared/language';
import { LOADING } from '$lib/shared/read-state';
import type { ReadState } from '$lib/shared/read-state';
import type { ModelFootprint } from '../../domain/model/model-footprint';
import type { ReadModelConsentResult } from '../../use-cases/model/read-model-consent';
import type {
  ModelStorageSnapshot,
  ReadModelStorageResult,
} from '../../use-cases/model/read-model-storage';

type EngineReading = {
  readonly chosen: ReadState<ModelFootprint | null>;
  readonly consent: ReadState<ReadModelConsentResult>;
  readonly storage: ReadState<ReadModelStorageResult>;
  readonly reload: () => void;
};

type EngineGateRead = EngineReading & { readonly language: Language | null };

type EngineSource = (language: Language) => EngineReading;

type ConsentStep =
  | { readonly kind: 'waiting' }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'nothing-to-download' }
  | { readonly kind: 'granted' }
  | { readonly kind: 'undecided'; readonly footprint: ModelFootprint };

type ConsentMemory = {
  readonly agreed: ReadonlySet<Language>;
  readonly declined: ReadonlySet<Language>;
  readonly toldDeclined: ReadonlySet<Language>;
};

type Admission =
  | { readonly kind: 'no-regions' }
  | { readonly kind: 'agreed' }
  | { readonly kind: 'waiting' }
  | { readonly kind: 'failed'; readonly message: string; readonly reload: () => void }
  | { readonly kind: 'nothing-to-download' }
  | { readonly kind: 'granted' }
  | { readonly kind: 'declined'; readonly footprint: ModelFootprint; readonly told: boolean }
  | { readonly kind: 'ask'; readonly footprint: ModelFootprint };

type WarmStep =
  | { readonly kind: 'waiting' }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'no-model' }
  | {
      readonly kind: 'read';
      readonly modelId: string;
      readonly snapshot: ModelStorageSnapshot | null;
    };

const NOT_READ: EngineReading = {
  chosen: LOADING,
  consent: LOADING,
  storage: LOADING,
  reload: () => undefined,
};

const WAITING = { kind: 'waiting' } as const;

function readingFor(read: EngineGateRead | undefined, language: Language): EngineReading {
  return read !== undefined && read.language === language ? read : NOT_READ;
}

function readsSettled(reading: EngineReading): boolean {
  if (reading.chosen.kind === 'loading' || reading.consent.kind === 'loading') return false;
  if (reading.chosen.kind !== 'ready' || reading.chosen.value === null) return true;
  return reading.storage.kind !== 'loading';
}

function consentFor(
  footprint: ModelFootprint,
  consent: ReadState<ReadModelConsentResult>,
): ConsentStep {
  return match(consent)
    .returnType<ConsentStep>()
    .with({ kind: 'loading' }, () => WAITING)
    .with({ kind: 'failed' }, ({ message }) => ({ kind: 'failed', message }))
    .with({ kind: 'ready', value: { kind: 'success', decision: 'granted' } }, () => ({
      kind: 'granted',
    }))
    .with({ kind: 'ready' }, () => ({ kind: 'undecided', footprint }))
    .exhaustive();
}

function consentStep(reading: EngineReading): ConsentStep {
  return match(reading.chosen)
    .returnType<ConsentStep>()
    .with({ kind: 'loading' }, () => WAITING)
    .with({ kind: 'failed' }, ({ message }) => ({ kind: 'failed', message }))
    .with({ kind: 'ready', value: P.nullish }, () => ({ kind: 'nothing-to-download' }))
    .with({ kind: 'ready', value: P.nonNullable }, ({ value }) =>
      consentFor(value, reading.consent),
    )
    .exhaustive();
}

function admission(
  language: Language,
  regions: number,
  memory: ConsentMemory,
  reading: () => EngineReading,
): Admission {
  if (regions === 0) return { kind: 'no-regions' };
  if (memory.agreed.has(language)) return { kind: 'agreed' };

  const read = reading();
  return match(consentStep(read))
    .returnType<Admission>()
    .with({ kind: 'waiting' }, () => WAITING)
    .with({ kind: 'failed' }, ({ message }) => ({
      kind: 'failed',
      message,
      reload: () => read.reload(),
    }))
    .with({ kind: 'nothing-to-download' }, () => ({ kind: 'nothing-to-download' }))
    .with({ kind: 'granted' }, () => ({ kind: 'granted' }))
    .with({ kind: 'undecided' }, ({ footprint }) =>
      memory.declined.has(language)
        ? { kind: 'declined', footprint, told: memory.toldDeclined.has(language) }
        : { kind: 'ask', footprint },
    )
    .exhaustive();
}

function storageFor(modelId: string, storage: ReadState<ReadModelStorageResult>): WarmStep {
  return match(storage)
    .returnType<WarmStep>()
    .with({ kind: 'loading' }, () => WAITING)
    .with({ kind: 'failed' }, ({ message }) => ({ kind: 'failed', message }))
    .with({ kind: 'ready', value: { kind: 'success' } }, ({ value }) => ({
      kind: 'read',
      modelId,
      snapshot: value.snapshot,
    }))
    .with({ kind: 'ready', value: { kind: 'cache-unavailable' } }, () => ({
      kind: 'read',
      modelId,
      snapshot: null,
    }))
    .exhaustive();
}

function warmStep(reading: EngineReading): WarmStep {
  return match(reading.chosen)
    .returnType<WarmStep>()
    .with({ kind: 'loading' }, () => WAITING)
    .with({ kind: 'failed' }, ({ message }) => ({ kind: 'failed', message }))
    .with({ kind: 'ready', value: P.nullish }, () => ({ kind: 'no-model' }))
    .with({ kind: 'ready', value: P.nonNullable }, ({ value }) =>
      storageFor(value.modelId, reading.storage),
    )
    .exhaustive();
}

export { NOT_READ, admission, consentStep, readingFor, readsSettled, warmStep };
export type {
  Admission,
  ConsentMemory,
  ConsentStep,
  EngineGateRead,
  EngineReading,
  EngineSource,
  WarmStep,
};
