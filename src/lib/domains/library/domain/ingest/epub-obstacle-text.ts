import { match } from 'ts-pattern';
import type { PageObstacle } from './epub-pages';

const ONE_IMAGE_RULE = 'Only an EPUB of one full-page image per page can be read yet.';

function describePageObstacle(obstacle: PageObstacle): string {
  return match(obstacle)
    .with(
      { kind: 'spine-unreadable' },
      () => 'This EPUB names no readable spine, so its page order is unknown.',
    )
    .with({ kind: 'spine-empty' }, () => 'This EPUB lists no pages in its spine.')
    .with(
      { kind: 'unmanifested' },
      (bad) => `This EPUB's spine names ${bad.idref}, and its manifest does not list it.`,
    )
    .with(
      { kind: 'page-missing' },
      (bad) => `This EPUB's spine names ${bad.path} and holds no such file.`,
    )
    .with({ kind: 'no-image' }, (bad) => `${bad.path} holds no image. ${ONE_IMAGE_RULE}`)
    .with(
      { kind: 'many-images' },
      (bad) => `${bad.path} holds ${bad.count} images. ${ONE_IMAGE_RULE}`,
    )
    .with(
      { kind: 'text-beside-the-image' },
      (bad) => `${bad.path} holds text beside its image (“${bad.text}”). ${ONE_IMAGE_RULE}`,
    )
    .with(
      { kind: 'image-missing' },
      (bad) => `${bad.path} points at ${bad.image}, and this EPUB holds no such file.`,
    )
    .exhaustive();
}

export { ONE_IMAGE_RULE, describePageObstacle };
