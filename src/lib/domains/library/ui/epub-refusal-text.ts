import { match } from 'ts-pattern';
import type { PageObstacle } from '../domain/ingest/epub-pages';
import type { BookProtection } from '../domain/ingest/epub-protection';
import type { EpubRefusal } from '../use-cases/open-file';

const ONE_IMAGE_RULE = 'Only an EPUB of one full-page image per page can be read yet.';

function describeProtection(protection: BookProtection): string {
  return match(protection)
    .with({ kind: 'rights-managed' }, () => 'This EPUB is locked by DRM, so it cannot be opened.')
    .with({ kind: 'encrypted' }, (locked) =>
      locked.algorithms.length === 0
        ? 'This EPUB is encrypted, so it cannot be opened.'
        : `This EPUB is encrypted with ${locked.algorithms.join(', ')}, so it cannot be opened.`,
    )
    .with({ kind: 'obfuscated-fonts' }, () => 'This EPUB only obfuscates its fonts.')
    .with({ kind: 'unprotected' }, () => 'This EPUB is not protected.')
    .exhaustive();
}

function describeEpubRefusal(refusal: EpubRefusal): string {
  return match(refusal)
    .with({ kind: 'protected' }, (locked) => describeProtection(locked.protection))
    .with(
      { kind: 'reflowable' },
      () =>
        'This EPUB reflows its text, and reading those is not built yet. Fixed-layout EPUBs, the kind manga uses, open today.',
    )
    .with(
      { kind: 'container-unreadable' },
      () => 'This EPUB names no package document, so its pages could not be found.',
    )
    .with(
      { kind: 'package-missing' },
      (missing) => `This EPUB names a package document at ${missing.path} and holds no such file.`,
    )
    .with(
      { kind: 'package-unreadable' },
      (broken) => `This EPUB's package document at ${broken.path} could not be read.`,
    )
    .with(
      { kind: 'archive-unreadable' },
      (broken) => `This EPUB could not be opened: ${broken.cause}`,
    )
    .exhaustive();
}

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

export { describeEpubRefusal, describePageObstacle };
