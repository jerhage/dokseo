import { match } from 'ts-pattern';
import type { BadgeVariant } from '$lib/components/classes';
import { megabytes } from '$lib/shared/bytes';
import { languageName } from '$lib/shared/language';
import type { ModelLoad } from '../../../../domain/model/model-load';
import { downloadMb } from '../../../../domain/model/model-footprint';
import type { ModelFootprint } from '../../../../domain/model/model-footprint';
import { OCR_ENGINES } from '../../../../domain/engine/ocr-engine';
import type { EngineStatus, EngineTone, OcrEngine } from '../../../../domain/engine/ocr-engine';
import { deviceName } from '../../../../domain/engine/recognizer-session';
import type { RecognizerSession } from '../../../../domain/engine/recognizer-session';
import type { ModelStorageSnapshot } from '../../../../use-cases/model/read-model-storage';

const FULL_PERCENT = 100;

type EngineAction =
  | { readonly kind: 'none' }
  | { readonly kind: 'resume' }
  | { readonly kind: 'download' }
  | { readonly kind: 'delete' };

type EngineActionInput = {
  readonly loading: boolean;
  readonly stored: boolean;
  readonly resumable: boolean;
  readonly confirmingRemoval: boolean;
};

const UNBUILT_ENGINES: readonly OcrEngine[] = OCR_ENGINES.filter((offered) => !offered.installed);

function engineActionOf(input: EngineActionInput): EngineAction {
  if (input.stored) return input.confirmingRemoval ? { kind: 'none' } : { kind: 'delete' };
  if (input.loading) return { kind: 'none' };

  return input.resumable ? { kind: 'resume' } : { kind: 'download' };
}

function statusVariant(tone: EngineTone): BadgeVariant {
  return match(tone)
    .returnType<BadgeVariant>()
    .with('ready', () => 'success')
    .with('busy', () => 'warning')
    .with('quiet', () => 'neutral')
    .with('bad', () => 'danger')
    .exhaustive();
}

function loadPercent(load: ModelLoad | null): number {
  return load === null ? 0 : Math.round(load.fraction * FULL_PERCENT);
}

function weightsFigure(model: ModelFootprint): string {
  return `${megabytes(model.weightsBytes)} MB of weights`;
}

function modelFootnote(model: ModelFootprint): string {
  return `${model.languages.map(languageName).join(', ')} · ${model.note}`;
}

function removalMb(storage: ModelStorageSnapshot | null, model: ModelFootprint): number {
  return storage === null ? downloadMb(model) : megabytes(storage.report.bytes);
}

function activeEngine(model: ModelFootprint | null): string {
  return model === null ? 'None' : `On-device · ${model.engine}`;
}

function activeDevice(session: RecognizerSession | null, status: EngineStatus): string {
  return session === null ? status.label : `running on the ${deviceName(session.device)}`;
}

export {
  UNBUILT_ENGINES,
  engineActionOf,
  statusVariant,
  loadPercent,
  weightsFigure,
  modelFootnote,
  removalMb,
  activeEngine,
  activeDevice,
};
export type { EngineAction, EngineActionInput };
