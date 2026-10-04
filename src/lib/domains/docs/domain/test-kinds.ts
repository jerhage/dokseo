import { match } from 'ts-pattern';

type BugPlace =
  | 'pure-logic'
  | 'view-model'
  | 'markup'
  | 'source-rule'
  | 'import-rule'
  | 'event-wiring'
  | 'dom-api'
  | 'layout'
  | 'device';

type Sighting = 'seen' | 'suspected';

type TestAdvice =
  | { readonly kind: 'unit'; readonly where: string; readonly reason: string }
  | { readonly kind: 'static'; readonly where: string; readonly reason: string }
  | { readonly kind: 'browser'; readonly where: string; readonly reason: string }
  | { readonly kind: 'probe'; readonly where: string; readonly reason: string }
  | { readonly kind: 'none'; readonly reason: string };

type BugPreset = {
  readonly key: string;
  readonly bug: string;
  readonly place: BugPlace;
  readonly sighting: Sighting;
};

const BUG_PLACES: readonly { readonly value: BugPlace; readonly label: string }[] = [
  { value: 'pure-logic', label: 'A pure function decides wrong' },
  { value: 'view-model', label: 'A view model holds the wrong state' },
  { value: 'markup', label: 'A component renders the wrong markup' },
  { value: 'source-rule', label: 'The source breaks a written convention' },
  { value: 'import-rule', label: 'A file imports across a boundary' },
  { value: 'event-wiring', label: 'An event never reaches its handler' },
  { value: 'dom-api', label: 'A browser API behaves differently from Node' },
  { value: 'layout', label: 'Something is the wrong size or in the wrong place' },
  { value: 'device', label: 'Only one engine, input or device shows it' },
];

const SIGHTINGS: readonly { readonly value: Sighting; readonly label: string }[] = [
  { value: 'seen', label: 'It happened' },
  { value: 'suspected', label: 'It might happen' },
];

const BUG_PRESETS: readonly BugPreset[] = [
  {
    key: 'drift',
    bug: 'A finger that drifts six pixels during a tap turns no page',
    place: 'pure-logic',
    sighting: 'seen',
  },
  {
    key: 'whitespace',
    bug: 'Renaming a tag to spaces leaves it with no name',
    place: 'view-model',
    sighting: 'seen',
  },
  {
    key: 'style-block',
    bug: 'A component gains a <style> block',
    place: 'source-rule',
    sighting: 'suspected',
  },
  {
    key: 'route-adapter',
    bug: 'A route imports the IndexedDB adapter directly',
    place: 'import-rule',
    sighting: 'suspected',
  },
  {
    key: 'double-turn',
    bug: 'After a tap turns past the end of an EPUB chapter, later taps do nothing',
    place: 'event-wiring',
    sighting: 'seen',
  },
  {
    key: 'clone',
    bug: 'IndexedDB refuses to store an import plan held in $state',
    place: 'dom-api',
    sighting: 'seen',
  },
  {
    key: 'sheet',
    bug: 'On an iPhone, a hidden sheet keeps its open height',
    place: 'device',
    sighting: 'seen',
  },
  {
    key: 'focus',
    bug: 'A dialog might lose focus in some browser',
    place: 'dom-api',
    sighting: 'suspected',
  },
];

function unitAdvice(place: 'pure-logic' | 'view-model' | 'markup' | 'source-rule'): TestAdvice {
  return match(place)
    .with('pure-logic', () => ({
      kind: 'unit' as const,
      where: 'a *.spec.ts beside the function',
      reason: 'The inputs and the answer are plain values, so Node runs it in milliseconds.',
    }))
    .with('view-model', () => ({
      kind: 'unit' as const,
      where: 'a *.spec.ts beside the *.svelte.ts view model',
      reason:
        '$state and $derived work in Node, so the spec builds the view model, calls its methods and reads its state.',
    }))
    .with('markup', () => ({
      kind: 'unit' as const,
      where: 'a *.spec.ts that renders with svelte/server',
      reason: 'The server render returns the HTML as a string, and the spec reads it.',
    }))
    .with('source-rule', () => ({
      kind: 'unit' as const,
      where: 'a *.spec.ts that reads the source files as text',
      reason: 'A convention about the source is a fact about text, and text needs no browser.',
    }))
    .exhaustive();
}

function browserAdvice(
  place: 'event-wiring' | 'dom-api' | 'layout',
  sighting: Sighting,
): TestAdvice {
  return match(sighting)
    .with('suspected', () => ({
      kind: 'none' as const,
      reason:
        'A browser test is for a real bug a unit test cannot reach. A suspicion earns a unit test of whatever logic it touches, or nothing.',
    }))
    .with('seen', () => ({
      kind: 'browser' as const,
      where: 'a *.svelte.spec.ts in the browser project',
      reason: match(place)
        .with('event-wiring', () => 'Node has no DOM events, so only Chromium can deliver them.')
        .with('dom-api', () => 'Node lacks the API, or the runes there skip the behavior.')
        .with('layout', () => 'Node computes no layout; only a browser has sizes.')
        .exhaustive(),
    }))
    .exhaustive();
}

function adviseTestKind(place: BugPlace, sighting: Sighting): TestAdvice {
  return match(place)
    .with('pure-logic', 'view-model', 'markup', 'source-rule', (unitPlace) => unitAdvice(unitPlace))
    .with('import-rule', () => ({
      kind: 'static' as const,
      where: 'a rule in .dependency-cruiser.cjs',
      reason: 'dependency-cruiser checks every import on every run; a test would check one file.',
    }))
    .with('event-wiring', 'dom-api', 'layout', (browserPlace) =>
      browserAdvice(browserPlace, sighting),
    )
    .with('device', () => ({
      kind: 'probe' as const,
      where: 'a Playwright probe against the built app, then the real device',
      reason:
        'The browser project runs Chromium on a desktop CPU. WebKit, real touch input and a slow phone are outside it.',
    }))
    .exhaustive();
}

function isBugPlace(value: string): value is BugPlace {
  return BUG_PLACES.some((place) => place.value === value);
}

function isSighting(value: string): value is Sighting {
  return SIGHTINGS.some((sighting) => sighting.value === value);
}

export { BUG_PLACES, BUG_PRESETS, SIGHTINGS, adviseTestKind, isBugPlace, isSighting };
export type { BugPlace, BugPreset, Sighting, TestAdvice };
