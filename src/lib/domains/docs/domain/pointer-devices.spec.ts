import { describe, expect, it } from 'vitest';
import { shownTurnSettings } from '$lib/shared/turn-settings';
import { DEVICE_PRESETS, POINTER_QUERIES, presetMatches } from './pointer-devices';

function shownFor(key: string): ReturnType<typeof shownTurnSettings> {
  const preset = DEVICE_PRESETS.find((candidate) => candidate.key === key);
  if (preset === undefined) throw new Error(`No preset ${key}`);
  return shownTurnSettings(presetMatches(preset));
}

describe('the pointer device presets', () => {
  it('names only queries the readout lists', () => {
    const known = POINTER_QUERIES.map((entry) => entry.query);

    for (const preset of DEVICE_PRESETS) {
      for (const matched of preset.matching) expect(known).toContain(matched);
    }
  });

  it('shows only the touch choice on an iPad whose Pencil adds a fine pointer', () => {
    expect(shownFor('ipad-pencil')).toEqual({ touchTurns: true, edgeClicks: false });
  });

  it('shows both settings on an iPad with a trackpad', () => {
    expect(shownFor('ipad-trackpad')).toEqual({ touchTurns: true, edgeClicks: true });
  });

  it('shows only the edge clicks on a desktop', () => {
    expect(shownFor('desktop')).toEqual({ touchTurns: false, edgeClicks: true });
  });
});
