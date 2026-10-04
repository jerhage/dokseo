import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decisionOf } from '$lib/domains/recognition/domain/model/model-consent';
import { CONSENT_CASES, CONSENT_RULES, isConsentRule, runConsentCases } from './consent-rules';

const SPEC = readFileSync('src/lib/domains/recognition/domain/model/model-consent.spec.ts', 'utf8');

function failingCases(rule: Parameters<typeof runConsentCases>[0]): readonly string[] {
  return runConsentCases(rule)
    .runs.filter((run) => run.outcome.kind !== 'passed')
    .map((run) => run.consentCase.what);
}

describe('the recorded decisionOf cases', () => {
  it.each(CONSENT_CASES.map((consentCase) => [consentCase.what] as const))(
    'names %s as the real spec does',
    (what) => {
      expect(SPEC).toContain(`what: '${what}'`);
    },
  );

  it('passes every case under the real decisionOf', () => {
    expect(failingCases('fixed')).toEqual([]);
    for (const consentCase of CONSENT_CASES) {
      expect(decisionOf(consentCase.consent, consentCase.model)).toBe(consentCase.decision);
    }
  });

  it('fails the cases where a grant outlives a change of model, before the fix', () => {
    expect(failingCases('language-only')).toEqual([
      'a grant for the default model once another is chosen',
      'a grant for a chosen model against the default',
      'a grant recorded against another model',
      'a record naming no model',
      'no offered model at all',
    ]);
  });

  it('fails the smaller replacement models under a rule that asks only when the size grows', () => {
    expect(failingCases('larger-only')).toEqual([
      'a grant for the default model once another is chosen',
      'a grant recorded against another model',
    ]);
  });

  it('offers each rule once', () => {
    expect(CONSENT_RULES.map((rule) => rule.value)).toEqual([
      'fixed',
      'language-only',
      'larger-only',
    ]);
    expect(isConsentRule('fixed')).toBe(true);
    expect(isConsentRule('model-only')).toBe(false);
  });
});
