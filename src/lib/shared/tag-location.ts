const TAG_PARAMETER = 'tag';

const TAGS_PLACE = '/tags';

function tagsHref(name: string | null): string {
  if (name === null || name.trim().length === 0) return TAGS_PLACE;

  return `${TAGS_PLACE}?${TAG_PARAMETER}=${encodeURIComponent(name.trim())}`;
}

function readTagName(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export { TAG_PARAMETER, TAGS_PLACE, tagsHref, readTagName };
