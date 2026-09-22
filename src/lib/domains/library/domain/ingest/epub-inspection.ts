import type { EpubPackage } from './epub-package';
import type { BookProtection } from './epub-protection';

type EpubInspection =
  | { readonly kind: 'not-an-epub' }
  | {
      readonly kind: 'epub';
      readonly packagePath: string;
      readonly packageDocument: EpubPackage;
    };

type EpubInspectionError =
  | { readonly kind: 'protected'; readonly protection: BookProtection }
  | { readonly kind: 'container-unreadable' }
  | { readonly kind: 'package-missing'; readonly path: string }
  | { readonly kind: 'package-unreadable'; readonly path: string }
  | { readonly kind: 'archive-unreadable'; readonly cause: string };

export type { EpubInspection, EpubInspectionError };
