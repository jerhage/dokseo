import type { SourceKind } from '../book/book';
import type { PageOrder } from '../book/page-list';
import type { IngestLimit } from './ingest-limits';
import type { PageObstacle } from './epub-pages';
import type { UploadReport } from './upload-progress';

type BuiltPages =
  | {
      readonly kind: 'images';
      readonly imageCount: number;
      readonly cover: Blob;
      readonly order: PageOrder;
    }
  | {
      readonly kind: 'unpaged';
      readonly obstacle: PageObstacle;
      readonly cover: Blob | null;
    };

type BuiltSource = {
  readonly blob: Blob;
  readonly sourceKind: SourceKind;
  readonly suggestedTitle: string;
  readonly metadataTitle: string | null;
  readonly pages: BuiltPages;
};

type SourceBuildError =
  | { readonly kind: 'nothing-usable' }
  | { readonly kind: 'unreadable'; readonly cause: string }
  | { readonly kind: 'empty' }
  | { readonly kind: 'refused'; readonly limit: IngestLimit };

type SourceBuild = { readonly kind: 'success'; readonly source: BuiltSource } | SourceBuildError;

interface SourceBuilder {
  build(files: readonly File[], report: UploadReport): Promise<SourceBuild>;
}

export type { BuiltPages, BuiltSource, SourceBuild, SourceBuildError, SourceBuilder };
