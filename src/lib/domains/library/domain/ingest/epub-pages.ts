import { match } from 'ts-pattern';
import { readPageContent } from './epub-page-content';
import type { PageContent } from './epub-page-content';
import type { EpubSpine } from './epub-spine';

type PageObstacle =
  | { readonly kind: 'spine-unreadable' }
  | { readonly kind: 'spine-empty' }
  | { readonly kind: 'unmanifested'; readonly idref: string }
  | { readonly kind: 'page-missing'; readonly path: string }
  | { readonly kind: 'no-image'; readonly path: string }
  | { readonly kind: 'many-images'; readonly path: string; readonly count: number }
  | { readonly kind: 'text-beside-the-image'; readonly path: string; readonly text: string }
  | { readonly kind: 'image-missing'; readonly path: string; readonly image: string };

type PageImage = { readonly page: string; readonly image: string };

type PageDocumentReader = (path: string) => Promise<string | null>;

type EpubPages =
  | { readonly kind: 'images'; readonly images: readonly PageImage[] }
  | { readonly kind: 'not-paged'; readonly obstacle: PageObstacle };

function notPaged(obstacle: PageObstacle): EpubPages {
  return { kind: 'not-paged', obstacle };
}

function contentObstacle(page: string, content: PageContent): PageObstacle | null {
  return match(content)
    .with({ kind: 'one-image' }, () => null)
    .with({ kind: 'no-image' }, (): PageObstacle => ({ kind: 'no-image', path: page }))
    .with({ kind: 'many-images' }, (many): PageObstacle => ({
      kind: 'many-images',
      path: page,
      count: many.count,
    }))
    .with({ kind: 'text-beside-the-image' }, (over): PageObstacle => ({
      kind: 'text-beside-the-image',
      path: page,
      text: over.text,
    }))
    .exhaustive();
}

async function imagesOf(
  paths: readonly string[],
  readDocument: PageDocumentReader,
): Promise<EpubPages> {
  const images: PageImage[] = [];
  for (const page of paths) {
    const xml = await readDocument(page);
    if (xml === null) return notPaged({ kind: 'page-missing', path: page });

    const content = readPageContent(xml, page);
    const obstacle = contentObstacle(page, content);
    if (obstacle !== null) return notPaged(obstacle);
    if (content.kind === 'one-image') images.push({ page, image: content.path });
  }
  return { kind: 'images', images };
}

async function resolveEpubPages(
  spine: EpubSpine,
  readDocument: PageDocumentReader,
): Promise<EpubPages> {
  const pages = await match(spine)
    .with({ kind: 'unreadable' }, () => notPaged({ kind: 'spine-unreadable' }))
    .with({ kind: 'empty' }, () => notPaged({ kind: 'spine-empty' }))
    .with({ kind: 'unmanifested' }, (bad) => notPaged({ kind: 'unmanifested', idref: bad.idref }))
    .with({ kind: 'spine' }, (found) => imagesOf(found.paths, readDocument))
    .exhaustive();
  return pages;
}

export { resolveEpubPages };
export type { EpubPages, PageDocumentReader, PageImage, PageObstacle };
