const UNSUPPORTED_NOTICE =
  'This browser is missing JavaScript features this app needs. Chrome and Firefox have them today.';

const SUPPORT_TABLE_URL =
  'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DisposableStack#browser_compatibility';

const SUPPORT_TABLE_LABEL = 'See which browsers have shipped it';

type LanguageFeatures = {
  readonly dispose: unknown;
  readonly disposableStack: unknown;
};

function featuresOf(scope: typeof globalThis): LanguageFeatures {
  return {
    dispose: (Symbol as { dispose?: unknown }).dispose,
    disposableStack: (scope as { DisposableStack?: unknown }).DisposableStack,
  };
}

function canRunHere(features: LanguageFeatures): boolean {
  return typeof features.dispose === 'symbol' && typeof features.disposableStack === 'function';
}

export { SUPPORT_TABLE_LABEL, SUPPORT_TABLE_URL, UNSUPPORTED_NOTICE, canRunHere, featuresOf };
export type { LanguageFeatures };
