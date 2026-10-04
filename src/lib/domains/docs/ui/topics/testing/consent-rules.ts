import { match } from 'ts-pattern';
import {
  consentFromStored,
  decisionOf,
  grantedConsent,
} from '$lib/domains/recognition/domain/model/model-consent';
import type {
  ModelConsent,
  ModelConsentDecision,
} from '$lib/domains/recognition/domain/model/model-consent';
import { modelFootprint, reads } from '$lib/domains/recognition/domain/model/model-footprint';
import type { ModelFootprint } from '$lib/domains/recognition/domain/model/model-footprint';
import { runCheck, testVerdict } from '../../../domain/spec-runner';
import type { CheckOutcome, TestVerdict } from '../../../domain/spec-runner';

type ConsentRule = 'fixed' | 'language-only' | 'larger-only';

type ConsentCase = {
  readonly what: string;
  readonly consent: ModelConsent | null;
  readonly model: ModelFootprint | null;
  readonly decision: ModelConsentDecision;
};

type ConsentRun = { readonly consentCase: ConsentCase; readonly outcome: CheckOutcome };

type ConsentRunSummary = {
  readonly runs: readonly ConsentRun[];
  readonly verdict: TestVerdict;
  readonly failing: number;
};

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

function grantFor(model: ModelFootprint): ModelConsent {
  return consentFromStored(grantedConsent('ja', GRANTED_AT, model));
}

const CONSENT_CASES: readonly ConsentCase[] = [
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
    consent: consentFromStored({
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
    consent: consentFromStored({ language: 'ja', grantedAt: GRANTED_AT }),
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
];

const CONSENT_RULES: readonly { readonly value: ConsentRule; readonly label: string }[] = [
  { value: 'fixed', label: 'The fix' },
  { value: 'language-only', label: 'Before the fix' },
  { value: 'larger-only', label: 'A size-only fix' },
];

function languageOnly(
  consent: ModelConsent | null,
  model: ModelFootprint | null,
): ModelConsentDecision {
  if (consent === null) return 'undecided';
  if (model !== null && !reads(model, consent.language)) return 'undecided';

  return 'granted';
}

function largerOnly(
  consent: ModelConsent | null,
  model: ModelFootprint | null,
): ModelConsentDecision {
  if (consent === null || model === null) return 'undecided';
  if (!reads(model, consent.language)) return 'undecided';
  if (consent.weightsBytes === null) return 'undecided';

  return model.weightsBytes <= consent.weightsBytes ? 'granted' : 'undecided';
}

function ruleDecision(
  rule: ConsentRule,
  consent: ModelConsent | null,
  model: ModelFootprint | null,
): ModelConsentDecision {
  return match(rule)
    .with('fixed', () => decisionOf(consent, model))
    .with('language-only', () => languageOnly(consent, model))
    .with('larger-only', () => largerOnly(consent, model))
    .exhaustive();
}

function runConsentCases(rule: ConsentRule): ConsentRunSummary {
  const runs = CONSENT_CASES.map((consentCase) => ({
    consentCase,
    outcome: runCheck(
      () => ruleDecision(rule, consentCase.consent, consentCase.model),
      consentCase.decision,
    ),
  }));
  const outcomes = runs.map((run) => run.outcome);
  return {
    runs,
    verdict: testVerdict(outcomes),
    failing: outcomes.filter((outcome) => outcome.kind !== 'passed').length,
  };
}

function isConsentRule(value: string): value is ConsentRule {
  return CONSENT_RULES.some((rule) => rule.value === value);
}

export { CONSENT_CASES, CONSENT_RULES, isConsentRule, ruleDecision, runConsentCases };
export type { ConsentCase, ConsentRule, ConsentRun, ConsentRunSummary };
