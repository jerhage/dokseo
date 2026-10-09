import type { QueryClient } from '@tanstack/svelte-query';
import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import type { Trace } from '$lib/platform/trace/pipeline-trace';
import type { Language } from '$lib/shared/language';
import { ACTION_NOTICE_MS } from '$lib/shared/notice';
import type { Notify } from '$lib/shared/notice';
import { logUnexpected } from '$lib/shared/unexpected-failure';
import { writeQuery } from '$lib/shared/write-query.svelte';
import type { WriteQuery } from '$lib/shared/write-query.svelte';
import { downloadMb } from '../../domain/model/model-footprint';
import type { ModelFootprint } from '../../domain/model/model-footprint';
import { grantConsentMutation } from '../../queries/engine-queries';
import { recognitionKeys } from '../../queries/recognition-keys';
import type { GrantModelConsentResult } from '../../use-cases/model/grant-model-consent';
import { consentStep } from './engine-gate';
import type { EngineSource } from './engine-gate';
import type { PendingRecognition } from './engine-warmth';

const RECOGNITION_OFF = 'Text recognition is off';

const RECOGNITION_OFF_REASON = 'You chose not to download the recognition model.';

const TURN_ON = 'Turn on';

const RECOGNITION_UNSTARTED = 'Text recognition could not start';

type ConsentRequest = {
  readonly language: Language;
  readonly footprint: ModelFootprint;
};

type WaitingCapture = {
  readonly held: PendingRecognition;
  readonly generation: number;
};

class ConsentGate {
  request = $state.raw<ConsentRequest | null>(null);

  #container: Container;
  #notify: Notify;
  #engine: EngineSource;
  #granting: WriteQuery<GrantModelConsentResult, Language>;
  #generation: () => number;
  #pendingRecognition: PendingRecognition | null = null;
  #waiting: WaitingCapture | null = null;
  #agreed = new Set<Language>();
  #declined = new Set<Language>();
  #toldDeclined = new Set<Language>();

  constructor(
    container: Container,
    notify: Notify,
    client: QueryClient,
    generation: () => number,
    engine: EngineSource,
  ) {
    this.#container = container;
    this.#notify = notify;
    this.#engine = engine;
    this.#generation = generation;
    this.#granting = writeQuery(() => ({
      ...grantConsentMutation(container.recognition),
      onError: (cause) => logUnexpected('write', cause),
      onSettled: (_granted, _cause, language) =>
        client.invalidateQueries({ queryKey: recognitionKeys.consent(language) }),
    }));
  }

  takeAsAgreed(language: Language): void {
    this.#agreed.add(language);
  }

  admits(held: PendingRecognition): boolean {
    const trace = this.#container.beginTrace('capture-gate');
    const admitted = this.#admits(trace, held);
    trace.end();
    return admitted;
  }

  resume(language: Language): PendingRecognition | null {
    const waiting = this.#waiting;
    if (waiting === null || waiting.held.language !== language) return null;
    this.#waiting = null;
    return waiting.generation === this.#generation() ? waiting.held : null;
  }

  #admits(trace: Trace, held: PendingRecognition): boolean {
    const language = held.language;
    if (held.regions.length === 0) {
      trace.step('stopped', { guard: 'no-regions' });
      return false;
    }

    if (this.#agreed.has(language)) {
      trace.step('reading', { gate: 'agreed-this-session', language });
      return true;
    }

    const reading = this.#engine(language);
    return match(consentStep(reading))
      .with({ kind: 'waiting' }, () => {
        this.#waiting = { held, generation: this.#generation() };
        trace.step('waiting', { gate: 'engine-reads', language });
        return false;
      })
      .with({ kind: 'failed' }, ({ message }) => {
        trace.step('stopped', { guard: 'engine-reads-failed', language });
        this.#notify({ tone: 'danger', title: RECOGNITION_UNSTARTED, message });
        reading.reload();
        return false;
      })
      .with({ kind: 'nothing-to-download' }, () => {
        trace.step('reading', { gate: 'nothing-to-download', language });
        return true;
      })
      .with({ kind: 'granted' }, () => {
        this.#agreed.add(language);
        trace.step('reading', { gate: 'consent-stored', language });
        return true;
      })
      .with({ kind: 'undecided' }, ({ footprint }) => this.#ask(trace, held, footprint))
      .exhaustive();
  }

  #ask(trace: Trace, held: PendingRecognition, footprint: ModelFootprint): boolean {
    const language = held.language;
    if (this.#declined.has(language)) {
      trace.step('stopped', { guard: 'declined-this-session', language });
      this.#tellDeclined(held, footprint);
      return false;
    }

    this.#pendingRecognition = held;
    this.request = { language, footprint };
    trace.step('asking', { gate: 'consent-dialog', language, downloadMb: downloadMb(footprint) });
    return false;
  }

  #tellDeclined(held: PendingRecognition, footprint: ModelFootprint): void {
    if (this.#toldDeclined.has(held.language)) return;
    this.#toldDeclined.add(held.language);

    const generation = this.#generation();
    this.#notify({
      tone: 'info',
      title: RECOGNITION_OFF,
      message: RECOGNITION_OFF_REASON,
      action: { label: TURN_ON, run: () => this.#askAgain(held, footprint, generation) },
      duration: ACTION_NOTICE_MS,
    });
  }

  #askAgain(held: PendingRecognition, footprint: ModelFootprint, generation: number): void {
    if (generation !== this.#generation() || this.request !== null) return;

    this.#pendingRecognition = held;
    this.request = { language: held.language, footprint };
  }

  async agree(): Promise<PendingRecognition | null> {
    const held = this.forget();
    if (held === null) return null;

    this.#agreed.add(held.language);
    await this.#granting.run(held.language).catch(() => null);
    return held;
  }

  decline(): void {
    const held = this.forget();
    if (held === null) return;

    this.#declined.add(held.language);
    this.#toldDeclined.delete(held.language);
  }

  forget(): PendingRecognition | null {
    const held = this.#pendingRecognition;
    this.#pendingRecognition = null;
    this.request = null;
    return held;
  }
}

export { RECOGNITION_OFF, RECOGNITION_UNSTARTED, TURN_ON, ConsentGate };
export type { ConsentRequest };
