import type { QueryClient } from '@tanstack/svelte-query';
import type { Container } from '$lib/container';
import type { Trace } from '$lib/platform/trace/pipeline-trace';
import type { Language } from '$lib/shared/language';
import { ACTION_NOTICE_MS } from '$lib/shared/notice';
import type { Notify } from '$lib/shared/notice';
import type { Result } from '$lib/shared/result';
import { writeQuery } from '$lib/shared/write-query.svelte';
import type { WriteQuery } from '$lib/shared/write-query.svelte';
import type { ModelConsentError } from '../../domain/model/model-consent';
import { downloadMb } from '../../domain/model/model-footprint';
import type { ModelFootprint } from '../../domain/model/model-footprint';
import { grantConsentMutation, modelConsentQuery } from '../../queries/engine-queries';
import { recognitionKeys } from '../../queries/recognition-keys';
import { readChosenFootprint } from './chosen-footprint';
import type { PendingRecognition } from './engine-warmup.svelte';

const RECOGNITION_OFF = 'Text recognition is off';

const RECOGNITION_OFF_REASON = 'You chose not to download the recognition model.';

const TURN_ON = 'Turn on';

type ConsentRequest = {
  readonly language: Language;
  readonly footprint: ModelFootprint;
};

class ConsentGate {
  request = $state.raw<ConsentRequest | null>(null);

  #container: Container;
  #notify: Notify;
  #client: QueryClient;
  #granting: WriteQuery<Result<void, ModelConsentError>, Language>;
  #generation: () => number;
  #pendingRecognition: PendingRecognition | null = null;
  #agreed = new Set<Language>();
  #declined = new Set<Language>();
  #toldDeclined = new Set<Language>();

  constructor(container: Container, notify: Notify, client: QueryClient, generation: () => number) {
    this.#container = container;
    this.#notify = notify;
    this.#client = client;
    this.#generation = generation;
    this.#granting = writeQuery(() => ({
      ...grantConsentMutation(container.recognition),
      onSettled: (_granted, _cause, language) =>
        client.invalidateQueries({ queryKey: recognitionKeys.consent(language) }),
    }));
  }

  takeAsAgreed(language: Language): void {
    this.#agreed.add(language);
  }

  async admits(held: PendingRecognition): Promise<boolean> {
    const trace = this.#container.beginTrace('capture-gate');
    const admitted = await this.#admits(trace, held);
    trace.end();
    return admitted;
  }

  async #admits(trace: Trace, held: PendingRecognition): Promise<boolean> {
    const language = held.language;
    if (held.regions.length === 0) {
      trace.step('stopped', { guard: 'no-regions' });
      return false;
    }

    if (this.#agreed.has(language)) {
      trace.step('reading', { gate: 'agreed-this-session', language });
      return true;
    }

    const recognition = this.#container.recognition;
    const footprint = await readChosenFootprint(this.#client, recognition, language);
    if (footprint === null) {
      trace.step('reading', { gate: 'nothing-to-download', language });
      return true;
    }

    const decision = await this.#client
      .fetchQuery(modelConsentQuery(recognition, language))
      .catch(() => null);
    if (decision === 'granted') {
      this.#agreed.add(language);
      trace.step('reading', { gate: 'consent-stored', language });
      return true;
    }

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

export { RECOGNITION_OFF, TURN_ON, ConsentGate };
export type { ConsentRequest };
