import { rememberedString } from '$lib/platform/storage/remembered-string';
import type { LocateStore } from '$lib/platform/storage/remembered-string';
import { applyAppearance, pinnedScheme } from './appearance';
import type { Appearance, RootAttributes } from './appearance';

const THEME_KEY = 'reader.theme';

const SCHEME_KEY = 'reader.color-scheme';

function chooseAppearance(
  root: RootAttributes,
  appearance: Appearance,
  locate?: LocateStore,
): void {
  applyAppearance(root, appearance);
  rememberedString(THEME_KEY, locate).write(appearance.theme);
  const scheme = rememberedString(SCHEME_KEY, locate);
  const pinned = pinnedScheme(appearance.colorScheme);
  if (pinned === undefined) scheme.forget();
  else scheme.write(pinned);
}

export { SCHEME_KEY, THEME_KEY, chooseAppearance };
