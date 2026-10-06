import { describe, expect, it } from 'vitest';
import { createContextMenuAreas } from './context-menu-areas';
import type { AreaListener } from './context-menu-areas';

type Heard = { readonly type: string; readonly value: string };

function recorder(heard: Heard[]): AreaListener<string> {
  return {
    contextmenu: (event, value) => heard.push({ type: event.type, value }),
    keydown: (event, value) => heard.push({ type: event.type, value }),
  };
}

function area(): HTMLElement {
  return new EventTarget() as unknown as HTMLElement;
}

describe('createContextMenuAreas', () => {
  it('passes a secondary click or a key on an area to the listener with that area value', () => {
    const areas = createContextMenuAreas<string>();
    const heard: Heard[] = [];
    areas.listen(recorder(heard));
    const first = area();
    const second = area();
    areas.area('Moby Dick')(first);
    areas.area('Dune')(second);

    first.dispatchEvent(new Event('contextmenu'));
    second.dispatchEvent(new Event('keydown'));

    expect(heard).toEqual([
      { type: 'contextmenu', value: 'Moby Dick' },
      { type: 'keydown', value: 'Dune' },
    ]);
  });

  it('passes nothing once the listener stops or the area is released', () => {
    const areas = createContextMenuAreas<string>();
    const heard: Heard[] = [];
    const stop = areas.listen(recorder(heard));
    const kept = area();
    const released = area();
    areas.area('Moby Dick')(kept);
    const release = areas.area('Dune')(released);

    if (typeof release === 'function') release();
    released.dispatchEvent(new Event('contextmenu'));
    stop();
    kept.dispatchEvent(new Event('contextmenu'));

    expect(heard).toEqual([]);
  });

  it('keeps a newer listener when an older one stops', () => {
    const areas = createContextMenuAreas<string>();
    const older: Heard[] = [];
    const newer: Heard[] = [];
    const stopOlder = areas.listen(recorder(older));
    areas.listen(recorder(newer));
    const row = area();
    areas.area('Moby Dick')(row);

    stopOlder();
    row.dispatchEvent(new Event('contextmenu'));

    expect([older, newer]).toEqual([[], [{ type: 'contextmenu', value: 'Moby Dick' }]]);
  });
});
