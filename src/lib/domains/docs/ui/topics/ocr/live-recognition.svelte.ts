import { match } from 'ts-pattern';
import type { RecognizerSession } from '$lib/domains/recognition/domain/engine/recognizer-session';
import type { ModelFootprint } from '$lib/domains/recognition/domain/model/model-footprint';
import type { ModelLoad } from '$lib/domains/recognition/domain/model/model-load';
import type { RecognizeRegionResult } from '$lib/domains/recognition/use-cases/engine/recognize-region';
import { describeCause } from '$lib/shared/cause';

type ModelPresence = 'stored' | 'not-stored' | 'cache-unavailable';

type LiveNotices = {
  readonly onProgress: (load: ModelLoad) => void;
  readonly onSession: (session: RecognizerSession) => void;
};

type LiveRecognitionDeps = {
  readonly chosenModel: () => Promise<ModelFootprint | null>;
  readonly presence: (modelId: string) => Promise<ModelPresence>;
  readonly recognize: (notices: LiveNotices) => Promise<RecognizeRegionResult>;
  readonly close: () => Promise<void>;
  readonly now: () => number;
  readonly onread?: (text: string, confidence: number | null) => void;
};

type LiveRecognitionState =
  | { readonly kind: 'checking' }
  | { readonly kind: 'no-model' }
  | { readonly kind: 'ready'; readonly model: ModelFootprint; readonly presence: ModelPresence }
  | {
      readonly kind: 'reading';
      readonly model: ModelFootprint;
      readonly load: ModelLoad | null;
      readonly session: RecognizerSession | null;
    }
  | {
      readonly kind: 'read';
      readonly model: ModelFootprint;
      readonly text: string;
      readonly confidence: number | null;
      readonly elapsedMs: number;
      readonly session: RecognizerSession | null;
    }
  | { readonly kind: 'failed'; readonly model: ModelFootprint; readonly message: string };

function failureText(result: Exclude<RecognizeRegionResult, { kind: 'success' }>): string {
  return match(result)
    .with({ kind: 'nothing-selected' }, () => 'The selection covers no pixels of the page.')
    .with({ kind: 'unreadable' }, ({ cause }) => `The page could not be cropped: ${cause}`)
    .with({ kind: 'no-text' }, () => 'The model read no text in this crop.')
    .with({ kind: 'model-unavailable' }, ({ cause }) => `The model could not be opened: ${cause}`)
    .with({ kind: 'recognition-failed' }, ({ cause }) => `Recognition failed: ${cause}`)
    .exhaustive();
}

class LiveRecognition {
  #state = $state.raw<LiveRecognitionState>({ kind: 'checking' });
  #started = false;
  readonly #deps: LiveRecognitionDeps;

  constructor(deps: LiveRecognitionDeps) {
    this.#deps = deps;
  }

  get state(): LiveRecognitionState {
    return this.#state;
  }

  async check(): Promise<void> {
    const model = await this.#deps.chosenModel();
    if (model === null) {
      this.#state = { kind: 'no-model' };
      return;
    }

    const presence = await this.#deps.presence(model.modelId);
    if (this.#state.kind === 'checking') this.#state = { kind: 'ready', model, presence };
  }

  async read(): Promise<void> {
    const current = this.#state;
    if (current.kind !== 'ready' && current.kind !== 'read' && current.kind !== 'failed') return;

    const model = current.model;
    this.#started = true;
    let session: RecognizerSession | null = null;
    this.#state = { kind: 'reading', model, load: null, session };
    const startedAt = this.#deps.now();

    try {
      const result = await this.#deps.recognize({
        onProgress: (load) => {
          if (this.#state.kind === 'reading') this.#state = { ...this.#state, load };
        },
        onSession: (opened) => {
          session = opened;
          if (this.#state.kind === 'reading') this.#state = { ...this.#state, session: opened };
        },
      });
      const elapsedMs = this.#deps.now() - startedAt;
      if (result.kind !== 'success') {
        this.#state = { kind: 'failed', model, message: failureText(result) };
        return;
      }

      const { text, confidence } = result.text;
      this.#state = { kind: 'read', model, text, confidence, elapsedMs, session };
      this.#deps.onread?.(text, confidence);
    } catch (cause) {
      this.#state = { kind: 'failed', model, message: describeCause(cause) };
    }
  }

  async dispose(): Promise<void> {
    if (!this.#started) return;
    this.#started = false;
    await this.#deps.close();
  }
}

export { LiveRecognition, failureText };
export type { LiveNotices, LiveRecognitionDeps, LiveRecognitionState, ModelPresence };
