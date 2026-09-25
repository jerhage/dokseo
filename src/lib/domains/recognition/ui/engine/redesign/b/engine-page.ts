import type { BadgeVariant } from '$lib/components/classes';
import { megabytes } from '$lib/shared/bytes';
import type { Language } from '$lib/shared/language';
import { onDiskMb, runtimeMb, weightsMb } from '../../../../domain/model/model-footprint';
import type { ModelFootprint } from '../../../../domain/model/model-footprint';
import { isPartlyDownloaded } from '../../../../domain/model/model-partial';
import type { PartialReport } from '../../../../domain/model/model-partial';
import { NOT_INSTALLED } from '../../../../domain/engine/ocr-engine';
import type { OcrEngine, TradeVerdict } from '../../../../domain/engine/ocr-engine';
import { deviceName } from '../../../../domain/engine/recognizer-session';
import type { RecognizerSession } from '../../../../domain/engine/recognizer-session';
import type { ModelStorageSnapshot } from '../../../../use-cases/model/read-model-storage';
import { storedFigure } from '../../engine-settings.svelte';
import { activeEngine, modelFootnote, statusVariant, weightsFigure } from '../engine-screen';

type FootprintFact = {
  readonly term: string;
  readonly detail: string;
};

type StoredLine =
  | { readonly kind: 'reading'; readonly text: string }
  | { readonly kind: 'failed'; readonly text: string }
  | { readonly kind: 'measured'; readonly text: string };

type EngineBadge = {
  readonly label: string;
  readonly variant: BadgeVariant;
};

const READING_STORAGE = 'Reading what is stored…';

function footprintFacts(model: ModelFootprint): readonly FootprintFact[] {
  return [
    { term: 'Weights download', detail: `about ${weightsMb(model)} MB` },
    { term: 'Runtime download', detail: `about ${runtimeMb(model)} MB` },
    { term: 'On disk', detail: `about ${onDiskMb(model)} MB` },
  ];
}

function engineLine(model: ModelFootprint, session: RecognizerSession | null): string {
  const engine = activeEngine(model);
  return session === null ? engine : `${engine} · running on the ${deviceName(session.device)}`;
}

function modelHint(model: ModelFootprint): string {
  return `${weightsFigure(model)} · ${modelFootnote(model)}`;
}

function verdictVariant(verdict: TradeVerdict): BadgeVariant {
  return verdict === 'good' ? 'success' : 'warning';
}

function engineBadge(engine: OcrEngine): EngineBadge {
  return engine.installed
    ? { label: 'In use', variant: 'brand' }
    : { label: NOT_INSTALLED.label, variant: statusVariant(NOT_INSTALLED.tone) };
}

function storedLine(storage: ModelStorageSnapshot | null, message: string | null): StoredLine {
  if (storage !== null) return { kind: 'measured', text: storedFigure(storage.report) };
  if (message !== null) return { kind: 'failed', text: message };
  return { kind: 'reading', text: READING_STORAGE };
}

function alreadyHere(partial: PartialReport | null): string | null {
  return partial !== null && isPartlyDownloaded(partial)
    ? `${megabytes(partial.bytes)} MB already here`
    : null;
}

function languageFrom(value: string, offered: readonly Language[]): Language | null {
  return offered.find((language) => language === value) ?? null;
}

export {
  footprintFacts,
  engineLine,
  modelHint,
  verdictVariant,
  engineBadge,
  storedLine,
  alreadyHere,
  languageFrom,
};
export type { FootprintFact, StoredLine, EngineBadge };
