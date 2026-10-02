import { match } from 'ts-pattern';
import { noticeBoard } from '$lib/platform/events/notice-board';
import { beginTrace } from '$lib/platform/trace/pipeline-trace';
import type { TraceFactory } from '$lib/platform/trace/pipeline-trace';
import type { Language } from '$lib/shared/language';
import { createRecognizerSetupStore } from '../domains/recognition/adapters/engine/indexeddb-recognizer-setup';
import type { ModelRuntime } from '../domains/recognition/domain/engine/model-runtime';
import type { RecognizerSession } from '../domains/recognition/domain/engine/recognizer-session';
import { setupChoice } from '../domains/recognition/domain/engine/recognizer-setup';
import type { RecognizerSetup } from '../domains/recognition/domain/engine/recognizer-setup';
import type { TextRecognizer } from '../domains/recognition/domain/engine/text-recognizer';
import { chosenModel } from '../domains/recognition/domain/model/model-footprint';
import type { ModelLoad } from '../domains/recognition/domain/model/model-load';
import { readRecognizerSetup } from '../domains/recognition/use-cases/engine/read-recognizer-setup';

type RecognitionProgress = (load: ModelLoad) => void;

type RecognitionSessionReport = (session: RecognizerSession) => void;

type RecognitionNotices = {
  readonly onProgress?: RecognitionProgress;
  readonly onSession?: RecognitionSessionReport;
};

const progressNotices = noticeBoard<Language, ModelLoad>();

const sessionNotices = noticeBoard<Language, RecognizerSession>();

const setups = createRecognizerSetupStore();

async function setupFor(language: Language): Promise<RecognizerSetup | null> {
  const read = await readRecognizerSetup({ setups }, language);
  const choice = read.kind === 'success' ? read.choice : setupChoice(language, null);
  if (choice.model === null) return null;
  return { modelId: choice.model.modelId, compute: choice.compute };
}

function noticesFor(language: Language): {
  readonly readSetup: () => Promise<RecognizerSetup | null>;
  readonly onProgress: (load: ModelLoad) => void;
  readonly onSession: (session: RecognizerSession) => void;
  readonly beginTrace: TraceFactory;
} {
  return {
    readSetup: () => setupFor(language),
    beginTrace,
    onProgress: (load) => {
      progressNotices.post(language, load);
    },
    onSession: (session) => {
      sessionNotices.post(language, session);
    },
  };
}

async function loadMangaOcrRecognizer(language: Language): Promise<TextRecognizer> {
  const { createMangaOcrRecognizer } =
    await import('../domains/recognition/adapters/engine/manga-ocr.adapter');
  return createMangaOcrRecognizer(noticesFor(language));
}

async function loadPaddleOcrRecognizer(language: Language): Promise<TextRecognizer> {
  const { createPaddleOcrRecognizer } =
    await import('../domains/recognition/adapters/engine/paddle-ocr.adapter');
  return createPaddleOcrRecognizer(noticesFor(language));
}

const recognizers = new Map<Language, Promise<TextRecognizer>>();

async function runtimeFor(language: Language): Promise<ModelRuntime> {
  const setup = await setupFor(language);
  const model = chosenModel(language, setup?.modelId ?? null);
  if (model === null) throw new Error(`No recognition model is known for ${language}.`);
  return model.runtime;
}

function recognizerFor(language: Language): Promise<TextRecognizer> {
  const held = recognizers.get(language);
  if (held !== undefined) return held;

  const loading = runtimeFor(language)
    .then((runtime) =>
      match(runtime)
        .with('manga-ocr', () => loadMangaOcrRecognizer(language))
        .with('paddle-ocr', () => loadPaddleOcrRecognizer(language))
        .exhaustive(),
    )
    .catch((cause: unknown): never => {
      recognizers.delete(language);
      throw cause;
    });

  recognizers.set(language, loading);
  return loading;
}

export { progressNotices, sessionNotices, setups, recognizers, recognizerFor };
export type { RecognitionProgress, RecognitionSessionReport, RecognitionNotices };
