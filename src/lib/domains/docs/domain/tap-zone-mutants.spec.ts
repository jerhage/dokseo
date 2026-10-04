import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { tapZone } from '$lib/shared/page-turn';
import type { TouchTurns } from '$lib/shared/page-turn';
import {
  MUTANTS,
  TAP_ZONE_SOURCE,
  ZONE_TESTS,
  checkText,
  mutantSource,
  mutantTapZone,
  runZoneTests,
} from './tap-zone-mutants';
import type { MutantKey } from './tap-zone-mutants';

const SOURCE = readFileSync('src/lib/shared/page-turn.ts', 'utf8');
const SPEC = readFileSync('src/lib/shared/page-turn.spec.ts', 'utf8');

const XS = [Number.NaN, -10, 0, 10, 116, 117, 118, 195, 272, 273, 274, 380, 390, 400];
const WIDTHS = [Number.NaN, -390, 0, 390, 1000];
const TURNS: readonly TouchTurns[] = ['tap-zones', 'swipe-only'];

function failedTests(key: MutantKey): readonly string[] {
  return runZoneTests(key)
    .filter((run) => run.verdict === 'failed')
    .map((run) => run.test.name);
}

describe('the tapZone copy', () => {
  it('quotes isPositiveFinite and tapZone exactly as page-turn.ts has them', () => {
    expect(SOURCE).toContain(TAP_ZONE_SOURCE);
  });

  it('answers as the real tapZone does for every input on the grid, unmutated', () => {
    const original = mutantTapZone('original');
    for (const x of XS) {
      for (const width of WIDTHS) {
        for (const turns of TURNS) {
          expect(original(x, width, turns)).toBe(tapZone(x, width, turns));
        }
      }
    }
  });

  it('changes exactly one fragment of the quoted source for each mutant', () => {
    for (const mutant of MUTANTS.filter((candidate) => candidate.key !== 'original')) {
      expect(TAP_ZONE_SOURCE.split(mutant.from)).toHaveLength(2);
      expect(mutantSource(mutant)).toContain(mutant.to);
    }
  });

  it('moves the boundary pixel in the or-equal mutants and nowhere else', () => {
    expect(mutantTapZone('left-or-equal')(117, 390, 'tap-zones')).toBe('left');
    expect(tapZone(117, 390, 'tap-zones')).toBe('centre');
    expect(mutantTapZone('right-or-equal')(273, 390, 'tap-zones')).toBe('right');
    expect(tapZone(273, 390, 'tap-zones')).toBe('centre');
  });
});

describe('the recorded tapZone tests', () => {
  it.each(ZONE_TESTS.map((test) => [test.name, test.quote] as const))(
    'quotes the real spec for %s',
    (name, quote) => {
      expect(SPEC).toContain(`'${name}'`);
      expect(SPEC).toContain(quote);
    },
  );

  it('passes all three tests on the unmutated copy', () => {
    expect(failedTests('original')).toEqual([]);
  });

  it('lets the two or-equal mutants survive and kills the others', () => {
    expect(failedTests('left-or-equal')).toEqual([]);
    expect(failedTests('right-or-equal')).toEqual([]);
    expect(failedTests('guard-and')).toEqual(['answers the centre for a frame it cannot divide']);
    expect(failedTests('variant-flipped')).toHaveLength(2);
    expect(failedTests('left-flipped')).toEqual([
      'splits the frame thirty, forty, thirty in the tap-zones variant',
    ]);
  });

  it('writes a check as the call the spec makes', () => {
    const [first] = ZONE_TESTS;

    expect(first?.checks.map(checkText).at(-1)).toBe(
      "tapZone(PHONE_WIDTH, PHONE_WIDTH, 'tap-zones')",
    );
  });
});
