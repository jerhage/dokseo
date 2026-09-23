import type { FoliateBook, ResourceDetail } from 'foliate-js/view.js';
import type { ChapterMarkup } from './chapter-sanitiser';

type SanitiseChapter = (markup: string, mediaType: ChapterMarkup) => string;

type ResourceTreatment =
  | { readonly kind: 'markup'; readonly mediaType: ChapterMarkup }
  | { readonly kind: 'opaque' };

type Transformable = Pick<FoliateBook, 'transformTarget'>;

const CHAPTER_MARKUP: readonly ChapterMarkup[] = [
  'application/xhtml+xml',
  'text/html',
  'image/svg+xml',
  'application/xml',
  'text/xml',
];

function essenceOf(mediaType: string): string {
  const parametersAt = mediaType.indexOf(';');
  const essence = parametersAt === -1 ? mediaType : mediaType.slice(0, parametersAt);
  return essence.trim().toLowerCase();
}

function treatmentOf(mediaType: string): ResourceTreatment {
  const declared = essenceOf(mediaType);
  const markup = CHAPTER_MARKUP.find((known) => known === declared);
  if (markup === undefined) return { kind: 'opaque' };
  return { kind: 'markup', mediaType: markup };
}

function sanitiseResource(detail: ResourceDetail, sanitise: SanitiseChapter): void {
  const treatment = treatmentOf(detail.type);
  if (treatment.kind === 'opaque') return;

  const loading = Promise.resolve(detail.data);
  detail.data = loading.then(async (loaded) => {
    const markup = typeof loaded === 'string' ? loaded : await loaded.text();
    return sanitise(markup, treatment.mediaType);
  });
}

function sanitisedDocument(
  doc: Document,
  mediaType: ChapterMarkup,
  sanitise: SanitiseChapter,
): Document {
  const markup = new XMLSerializer().serializeToString(doc);

  return new DOMParser().parseFromString(sanitise(markup, mediaType), mediaType);
}

function sanitiseChapters(book: Transformable, sanitise: SanitiseChapter): void {
  book.transformTarget.addEventListener('data', (resource) => {
    sanitiseResource(resource.detail, sanitise);
  });
}

export { essenceOf, sanitiseChapters, sanitiseResource, sanitisedDocument, treatmentOf };
export type { ResourceTreatment, SanitiseChapter, Transformable };
