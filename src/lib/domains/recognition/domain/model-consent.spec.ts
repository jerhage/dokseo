import { describe, expect, it } from 'vitest';
import {
  consentFromStored,
  decisionOf,
  grantedConsent,
  type ModelConsent,
  type StoredModelConsent,
} from './model-consent';
import { modelFootprint, type ModelFootprint } from './model-footprint';

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
  it('records the model the reader was shown and the bytes it weighs', () => {
    expect(grantedConsent('ja', GRANTED_AT, japanese())).toEqual({
      language: 'ja',
      grantedAt: GRANTED_AT,
      modelId: japanese().modelId,
      weightsBytes: japanese().weightsBytes,
    });
  });

  it('records the model that was chosen rather than the one the language defaults to', () => {
    expect(grantedConsent('ja', GRANTED_AT, SECOND_JAPANESE_MODEL)).toEqual({
      language: 'ja',
      grantedAt: GRANTED_AT,
      modelId: SECOND_JAPANESE_MODEL.modelId,
      weightsBytes: SECOND_JAPANESE_MODEL.weightsBytes,
    });
  });

  it('records no model for a language whose model has not been chosen', () => {
    expect(grantedConsent('ko', GRANTED_AT, null)).toEqual({
      language: 'ko',
      grantedAt: GRANTED_AT,
      modelId: null,
      weightsBytes: null,
    });
  });
});

describe('decisionOf', () => {
  it('reports a grant for the model in use as granted', () => {
    expect(decisionOf(read(grantedConsent('ja', GRANTED_AT, japanese())), japanese())).toBe(
      'granted',
    );
  });

  it('reports a grant for the default model as undecided once another is chosen', () => {
    const agreedToTheDefault = read(grantedConsent('ja', GRANTED_AT, japanese()));

    expect(decisionOf(agreedToTheDefault, SECOND_JAPANESE_MODEL)).toBe('undecided');
  });

  it('reports a grant for a chosen model as granted against that same model', () => {
    const agreedToTheSecond = read(grantedConsent('ja', GRANTED_AT, SECOND_JAPANESE_MODEL));

    expect(decisionOf(agreedToTheSecond, SECOND_JAPANESE_MODEL)).toBe('granted');
    expect(decisionOf(agreedToTheSecond, japanese())).toBe('undecided');
  });

  it('reports a grant recorded against another model as undecided', () => {
    const agreedToBefore = read({
      language: 'ja',
      grantedAt: GRANTED_AT,
      modelId: PREVIOUS_MODEL_ID,
      weightsBytes: PREVIOUS_WEIGHTS_BYTES,
    });

    expect(agreedToBefore.weightsBytes).toBeGreaterThan(japanese().weightsBytes);
    expect(decisionOf(agreedToBefore, japanese())).toBe('undecided');
  });

  it('reports a record naming no model as undecided', () => {
    expect(decisionOf(read({ language: 'ja', grantedAt: GRANTED_AT }), japanese())).toBe(
      'undecided',
    );
  });

  it('reports no record at all as undecided', () => {
    expect(decisionOf(null, japanese())).toBe('undecided');
  });

  it('reports no offered model at all as undecided', () => {
    expect(decisionOf(read(grantedConsent('ja', GRANTED_AT, japanese())), null)).toBe('undecided');
  });

  it('reports a grant for one language as undecided for the other', () => {
    const japaneseGrant = read(grantedConsent('ja', GRANTED_AT, japanese()));
    const korean: ModelFootprint = { ...japanese(), language: 'ko' };

    expect(decisionOf(japaneseGrant, japanese())).toBe('granted');
    expect(decisionOf(japaneseGrant, korean)).toBe('undecided');
  });
});
