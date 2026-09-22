import type { Language } from '$lib/shared/language';
import { LANGUAGES } from '$lib/shared/language';

function primarySubtag(tag: string): string {
  const [primary] = tag.trim().toLowerCase().split(/[-_]/u);

  return primary ?? '';
}

function languageDeclared(tag: string | null): Language | null {
  if (tag === null) return null;

  const primary = primarySubtag(tag);

  return LANGUAGES.find((known) => known === primary) ?? null;
}

export { languageDeclared };
