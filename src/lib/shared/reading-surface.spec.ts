import { describe, expect, it } from 'vitest';
import { QUIET_FOCUS, returnFocusToPage } from './reading-surface';
import type { Bar, FocusHolder, ReadingSurface } from './reading-surface';

type Control = FocusHolder & { readonly name: string };

type Recorded = {
  readonly steps: string[];
  readonly surface: ReadingSurface;
  readonly control: (name: string) => Control;
};

function recorded(): Recorded {
  const steps: string[] = [];
  return {
    steps,
    surface: {
      focus: (options) => {
        steps.push(`focus surface ${JSON.stringify(options)}`);
      },
    },
    control: (name) => ({
      name,
      blur: () => {
        steps.push(`blur ${name}`);
      },
    }),
  };
}

function barHolding(...held: Control[]): Bar<Control> {
  return { contains: (node) => held.includes(node) };
}

describe('returnFocusToPage', () => {
  it('moves focus from a control in a bar to the reading surface, quietly', () => {
    const log = recorded();
    const settings = log.control('settings');

    returnFocusToPage(settings, [barHolding(settings), barHolding()], log.surface);

    expect(log.steps).toEqual(['blur settings', `focus surface ${JSON.stringify(QUIET_FOCUS)}`]);
  });

  it('finds the control in the bottom bar as well as the top one', () => {
    const log = recorded();
    const next = log.control('next');

    returnFocusToPage(next, [barHolding(), barHolding(next)], log.surface);

    expect(log.steps).toEqual(['blur next', `focus surface ${JSON.stringify(QUIET_FOCUS)}`]);
  });

  it('asks the surface not to scroll and not to show a focus ring', () => {
    expect(QUIET_FOCUS).toEqual({ preventScroll: true, focusVisible: false });
  });

  it('leaves focus that sits outside the bars where it is', () => {
    const log = recorded();
    const editor = log.control('editor');

    returnFocusToPage(editor, [barHolding(log.control('settings')), null], log.surface);

    expect(log.steps).toEqual([]);
  });

  it('does nothing when nothing holds focus', () => {
    const log = recorded();

    returnFocusToPage(null, [barHolding()], log.surface);

    expect(log.steps).toEqual([]);
  });

  it('still releases the bar control when no reading surface is showing', () => {
    const log = recorded();
    const library = log.control('library');

    returnFocusToPage(library, [barHolding(library)], null);

    expect(log.steps).toEqual(['blur library']);
  });
});
