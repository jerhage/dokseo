import { match } from 'ts-pattern';
import type { EpubInspectionError } from '../domain/ingest/epub-inspection';
import type { BookProtection } from '../domain/ingest/epub-protection';
import { describeIngestLimit } from '../domain/ingest/ingest-limits';

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

function describeEpubRefusal(refusal: EpubInspectionError): string {
  return match(refusal)
    .with({ kind: 'protected' }, (locked) => describeProtection(locked.protection))
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
    .with({ kind: 'too-large' }, (over) => describeIngestLimit(over.limit))
    .exhaustive();
}

export { describeEpubRefusal };
