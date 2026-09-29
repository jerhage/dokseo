import { rememberedSet } from '$lib/platform/storage/remembered-set';
import { isGuideKind } from './guide-kind';
import type { GuideKind } from './guide-kind';

const SEEN_GUIDES_KEY = 'reader.touch.guides-seen';

const remembered = rememberedSet(SEEN_GUIDES_KEY);

let seen = $state.raw<readonly GuideKind[]>(remembered.values().filter(isGuideKind));

function guideSeen(kind: GuideKind): boolean {
  return seen.includes(kind);
}

function markGuideSeen(kind: GuideKind): void {
  if (seen.includes(kind)) return;

  seen = remembered.add(kind).filter(isGuideKind);
}

export { SEEN_GUIDES_KEY, guideSeen, markGuideSeen };
