import { describe, expect, it, vi } from 'vitest';
import { DockSheet } from './dock-sheet.svelte';

function measured(onclose: () => void = () => undefined): DockSheet {
  const sheet = new DockSheet(onclose);
  sheet.heights.standard = 300;
  sheet.heights.tall = 600;
  return sheet;
}

describe('DockSheet', () => {
  it('follows the finger in pixels while it drags', () => {
    const sheet = measured();

    sheet.press({ id: 1, y: 500, t: 0 }, 300);
    sheet.follow({ id: 1, y: 400, t: 1000 });

    expect(sheet.dragging).toBe(true);
    expect(sheet.height).toBe('400px');
  });

  it('ignores a second finger while the first drags', () => {
    const sheet = measured();

    sheet.press({ id: 1, y: 500, t: 0 }, 300);

    expect(sheet.press({ id: 2, y: 100, t: 0 }, 300)).toBe(false);
    sheet.follow({ id: 2, y: 0, t: 10 });
    expect(sheet.height).toBe('300px');
  });

  it('settles a drag up at the tall height', () => {
    const sheet = measured();

    sheet.press({ id: 1, y: 500, t: 0 }, 300);
    sheet.follow({ id: 1, y: 250, t: 1000 });
    sheet.release({ id: 1, y: 250, t: 2000 });

    expect(sheet.dragging).toBe(false);
    expect(sheet.detent).toBe('tall');
    expect(sheet.height).toBe('var(--layout-sheet-height-tall)');
  });

  it('closes on a drag down below the standard height and reopens at it', () => {
    const onclose = vi.fn();
    const sheet = measured(onclose);
    sheet.detent = 'tall';

    sheet.press({ id: 1, y: 100, t: 0 }, 600);
    sheet.release({ id: 1, y: 650, t: 2000 });

    expect(onclose).toHaveBeenCalledOnce();
    expect(sheet.detent).toBe('standard');
  });

  it('returns to its detent when the drag is cancelled', () => {
    const onclose = vi.fn();
    const sheet = measured(onclose);

    sheet.press({ id: 1, y: 500, t: 0 }, 300);
    sheet.follow({ id: 1, y: 900, t: 100 });
    sheet.cancel(1);

    expect(sheet.dragging).toBe(false);
    expect(sheet.height).toBe('var(--layout-sheet-height)');
    expect(onclose).not.toHaveBeenCalled();
  });

  it('swallows the click that ends a drag', () => {
    const sheet = measured();

    sheet.press({ id: 1, y: 500, t: 0 }, 300);
    sheet.release({ id: 1, y: 250, t: 2000 });
    sheet.activate(false);

    expect(sheet.detent).toBe('tall');
  });

  it('switches the height on a tap that did not move', () => {
    const sheet = measured();

    sheet.press({ id: 1, y: 500, t: 0 }, 300);
    sheet.release({ id: 1, y: 504, t: 100 });
    sheet.activate(false);

    expect(sheet.detent).toBe('tall');
  });

  it('switches the height on a keyboard press even after a drag', () => {
    const sheet = measured();

    sheet.press({ id: 1, y: 500, t: 0 }, 300);
    sheet.release({ id: 1, y: 250, t: 2000 });
    sheet.activate(true);

    expect(sheet.detent).toBe('standard');
  });

  it('steps with the arrow keys and reports the keys it handled', () => {
    const sheet = measured();

    expect(sheet.key('ArrowUp')).toBe(true);
    expect(sheet.detent).toBe('tall');
    expect(sheet.key('ArrowDown')).toBe(true);
    expect(sheet.detent).toBe('standard');
    expect(sheet.key('Tab')).toBe(false);
  });
});
