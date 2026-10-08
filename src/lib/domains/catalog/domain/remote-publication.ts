import type { CatalogId } from '$lib/shared/ids';
import type { Language } from '$lib/shared/language';

type FeedStep = { readonly title: string; readonly href: string };

type FeedPath = readonly FeedStep[];

type AcquisitionFormat = 'epub' | 'pdf' | 'cbz';

type Acquisition = {
  readonly href: string;
  readonly format: AcquisitionFormat;
  readonly mediaType: string;
  readonly length: number | null;
};

type RemoteImage = { readonly href: string; readonly mediaType: string | null };

type RemotePublication = {
  readonly catalogId: CatalogId;
  readonly entryId: string;
  readonly title: string;
  readonly authors: readonly string[];
  readonly language: Language | null;
  readonly summary: string;
  readonly updated: string;
  readonly cover: RemoteImage | null;
  readonly acquisition: Acquisition | null;
  readonly feedPath: FeedPath;
};

const FEED_PATH_SEPARATOR = ' › ';

const FORMATS_BY_MEDIA_TYPE: ReadonlyMap<string, AcquisitionFormat> = new Map([
  ['application/epub+zip', 'epub'],
  ['application/pdf', 'pdf'],
  ['application/vnd.comicbook+zip', 'cbz'],
  ['application/x-cbz', 'cbz'],
  ['application/zip', 'cbz'],
]);

function feedPathLabel(path: FeedPath): string {
  return path.map((step) => step.title).join(FEED_PATH_SEPARATOR);
}

function formatOfMediaType(mediaType: string): AcquisitionFormat | null {
  const [bare] = mediaType.split(';');
  return FORMATS_BY_MEDIA_TYPE.get((bare ?? '').trim().toLowerCase()) ?? null;
}

export { feedPathLabel, formatOfMediaType };
export type { Acquisition, AcquisitionFormat, FeedPath, FeedStep, RemoteImage, RemotePublication };
