import { describe, expect, it } from 'vitest';
import { BUG_PLACES, BUG_PRESETS, SIGHTINGS, adviseTestKind, isBugPlace } from './test-kinds';
import type { BugPlace } from './test-kinds';

describe('adviseTestKind', () => {
  it.each([
    ['pure-logic', 'unit'],
    ['view-model', 'unit'],
    ['markup', 'unit'],
    ['source-rule', 'unit'],
    ['import-rule', 'static'],
    ['event-wiring', 'browser'],
    ['dom-api', 'browser'],
    ['layout', 'browser'],
    ['device', 'probe'],
  ] as const)('sends a seen bug in %s to a %s check', (place, kind) => {
    expect(adviseTestKind(place, 'seen').kind).toBe(kind);
  });

  it.each(['event-wiring', 'dom-api', 'layout'] as const)(
    'writes no browser test for a suspected bug in %s',
    (place) => {
      expect(adviseTestKind(place, 'suspected').kind).toBe('none');
    },
  );

  it('gives a unit test whether or not a pure logic bug has happened', () => {
    expect(adviseTestKind('pure-logic', 'suspected').kind).toBe('unit');
  });

  it('offers every place and sighting it advises on, and nothing else', () => {
    const places: readonly BugPlace[] = BUG_PLACES.map((place) => place.value);

    expect(new Set(places).size).toBe(places.length);
    expect(SIGHTINGS.map((sighting) => sighting.value)).toEqual(['seen', 'suspected']);
    expect(isBugPlace('layout')).toBe(true);
    expect(isBugPlace('network')).toBe(false);
  });

  it('names every preset by a distinct key and a place it offers', () => {
    const keys = BUG_PRESETS.map((preset) => preset.key);

    expect(new Set(keys).size).toBe(keys.length);
    expect(BUG_PRESETS.every((preset) => isBugPlace(preset.place))).toBe(true);
  });
});
