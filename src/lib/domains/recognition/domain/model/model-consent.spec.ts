import { describe, expect, it } from 'vitest';
import { consentFromStored, decisionOf, grantedConsent } from './model-consent';
import type { ModelConsent, StoredModelConsent } from './model-consent';
import { modelFootprint } from './model-footprint';
import type { ModelFootprint } from './model-footprint';

const GRANTED_AT = 1_758_240_000_000;

const PREVIOUS_MODEL_ID = 'dnouv/manga-ocr';

const PREVIOUS_WEIGHTS_BYTES = 442_000_000;

function japanese(): ModelFootprint {
  const footprint = modelFootprint('ja');
  if (footprint === null) throw new Error('Japanese has a model to download');
  return footprint;
}

const SECOND_JAPANESE_MODEL: ModelFootprint = {
  ...japanese(),
  modelId: 'DigitalLarynx/manga-ocr-onnx-small',
  label: 'manga-ocr small',
  weightsBytes: 96_000_000,
};

function read(stored: StoredModelConsent): ModelConsent {
  return consentFromStored(stored);
}

describe('consentFromStored', () => {
  it('reads a record written before the model was named as naming none', () => {
    const consent = read({ language: 'ja', grantedAt: GRANTED_AT });

    expect(consent).toEqual({
      language: 'ja',
      grantedAt: GRANTED_AT,
      modelId: null,
      weightsBytes: null,
    });
  });

  it('keeps the model and the size a newer record already carries', () => {
    const consent = read({
      language: 'ja',
      grantedAt: GRANTED_AT,
      modelId: PREVIOUS_MODEL_ID,
      weightsBytes: PREVIOUS_WEIGHTS_BYTES,
    });

    expect(consent.modelId).toBe(PREVIOUS_MODEL_ID);
    expect(consent.weightsBytes).toBe(PREVIOUS_WEIGHTS_BYTES);
  });
});

describe('grantedConsent', () => {
  it.each([
    {
      what: 'the model the reader was shown and the bytes it weighs',
      language: 'ja',
      model: japanese(),
      modelId: japanese().modelId,
      weightsBytes: japanese().weightsBytes,
    },
    {
      what: 'the model that was chosen rather than the one the language defaults to',
      language: 'ja',
      model: SECOND_JAPANESE_MODEL,
      modelId: 'DigitalLarynx/manga-ocr-onnx-small',
      weightsBytes: 96_000_000,
    },
    {
      what: 'no model for a language whose model has not been chosen',
      language: 'ko',
      model: null,
      modelId: null,
      weightsBytes: null,
    },
  ] as const)('records $what', ({ language, model, modelId, weightsBytes }) => {
    expect(grantedConsent(language, GRANTED_AT, model)).toEqual({
      language,
      grantedAt: GRANTED_AT,
      modelId,
      weightsBytes,
    });
  });
});

describe('decisionOf', () => {
  const grantFor = (model: ModelFootprint): ModelConsent =>
    read(grantedConsent('ja', GRANTED_AT, model));

  it.each([
    {
      what: 'a grant for the model in use',
      consent: grantFor(japanese()),
      model: japanese(),
      decision: 'granted',
    },
    {
      what: 'a grant for the default model once another is chosen',
      consent: grantFor(japanese()),
      model: SECOND_JAPANESE_MODEL,
      decision: 'undecided',
    },
    {
      what: 'a grant for a chosen model against that same model',
      consent: grantFor(SECOND_JAPANESE_MODEL),
      model: SECOND_JAPANESE_MODEL,
      decision: 'granted',
    },
    {
      what: 'a grant for a chosen model against the default',
      consent: grantFor(SECOND_JAPANESE_MODEL),
      model: japanese(),
      decision: 'undecided',
    },
    {
      what: 'a grant recorded against another model',
      consent: read({
        language: 'ja',
        grantedAt: GRANTED_AT,
        modelId: PREVIOUS_MODEL_ID,
        weightsBytes: PREVIOUS_WEIGHTS_BYTES,
      }),
      model: japanese(),
      decision: 'undecided',
    },
    {
      what: 'a record naming no model',
      consent: read({ language: 'ja', grantedAt: GRANTED_AT }),
      model: japanese(),
      decision: 'undecided',
    },
    { what: 'no record at all', consent: null, model: japanese(), decision: 'undecided' },
    {
      what: 'no offered model at all',
      consent: grantFor(japanese()),
      model: null,
      decision: 'undecided',
    },
    {
      what: 'a grant for one language against a model of the other',
      consent: grantFor(japanese()),
      model: { ...japanese(), languages: ['ko'] },
      decision: 'undecided',
    },
  ] as const)('reports $what as $decision', ({ consent, model, decision }) => {
    expect(decisionOf(consent, model)).toBe(decision);
  });
});
