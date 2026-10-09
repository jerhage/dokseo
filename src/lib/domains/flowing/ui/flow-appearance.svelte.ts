import { DEFAULT_READING_SETTINGS } from '../domain/reading-settings';
import type { ReadingSettings } from '../domain/reading-settings';
import { INK_FOR_THE_DARK_PAGE, sameInk } from './flow-styles';
import type { PageInk } from './flow-styles';
import type { FlowSurface } from './flow-surface';

function createFlowAppearance(
  surface: () => FlowSurface | null,
  save: (settings: ReadingSettings) => void,
) {
  let settings = $state.raw<ReadingSettings>(DEFAULT_READING_SETTINGS);
  let ink: PageInk = INK_FOR_THE_DARK_PAGE;

  return {
    get settings(): ReadingSettings {
      return settings;
    },
    get ink(): PageInk {
      return ink;
    },
    set(next: ReadingSettings): void {
      settings = next;
    },
    restyle(next: ReadingSettings): void {
      settings = next;
      surface()?.restyle(next, ink);
      save(next);
    },
    paint(next: PageInk): void {
      if (sameInk(ink, next)) return;

      ink = next;
      surface()?.restyle(settings, next);
    },
    repaintSince(inked: PageInk, on: FlowSurface): void {
      if (!sameInk(inked, ink)) on.restyle(settings, ink);
    },
  };
}

type FlowAppearanceHook = ReturnType<typeof createFlowAppearance>;

export { createFlowAppearance };
export type { FlowAppearanceHook };
