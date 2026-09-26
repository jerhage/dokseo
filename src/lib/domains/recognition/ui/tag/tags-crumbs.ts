import { match } from 'ts-pattern';
import { TAGS_PLACE } from '$lib/shared/tag-location';

type TagsPlace = 'tags' | 'manage';

type Crumb = { readonly label: string; readonly href?: string };

function tagsCrumbs(place: TagsPlace): readonly Crumb[] {
  const library: Crumb = { label: 'Library', href: '/' };

  return match(place)
    .with('tags', (): readonly Crumb[] => [library, { label: 'Tags' }])
    .with('manage', (): readonly Crumb[] => [
      library,
      { label: 'Tags', href: TAGS_PLACE },
      { label: 'Manage' },
    ])
    .exhaustive();
}

export { tagsCrumbs };
export type { Crumb, TagsPlace };
