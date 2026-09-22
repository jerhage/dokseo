import type { FoliateBook, ResourceDetail } from 'foliate-js/view.js';
import type { ChapterMarkup } from './chapter-sanitiser';

type SanitiseChapter = (markup: string, mediaType: ChapterMarkup) => string;

type ResourceTreatment =
  | { readonly kind: 'markup'; readonly mediaType: ChapterMarkup }
  | { readonly kind: 'opaque' };

type Transformable = Pick<FoliateBook, 'transformTarget'>;

const CHAPTER_MARKUP: readonly ChapterMarkup[] = ['application/xhtml+xml', 'text/html'];

function treatmentOf(mediaType: string): ResourceTreatment {
  const markup = CHAPTER_MARKUP.find((known) => known === mediaType);
  if (markup === undefined) return { kind: 'opaque' };
  return { kind: 'markup', mediaType: markup };
}

function sanitiseResource(detail: ResourceDetail, sanitise: SanitiseChapter): void {
  const treatment = treatmentOf(detail.type);
  if (treatment.kind === 'opaque') return;

  const loading = Promise.resolve(detail.data);
  detail.data = loading.then((loaded) =>
    typeof loaded === 'string' ? sanitise(loaded, treatment.mediaType) : loaded,
  );
}

function sanitiseChapters(book: Transformable, sanitise: SanitiseChapter): void {
  book.transformTarget.addEventListener('data', (resource) => {
    sanitiseResource(resource.detail, sanitise);
  });
}

export { sanitiseChapters, sanitiseResource, treatmentOf };
export type { ResourceTreatment, SanitiseChapter, Transformable };
