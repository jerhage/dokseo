import type { Result } from '$lib/shared/result';
import type { SourceKind } from '../book/book';
import type { PageObstacle } from './epub-pages';
import type { UploadReport } from './upload-progress';

type BuiltPages =
  | { readonly kind: 'images'; readonly imageCount: number; readonly cover: Blob }
  | { readonly kind: 'unpaged'; readonly obstacle: PageObstacle };

type BuiltSource = {
  readonly blob: Blob;
  readonly sourceKind: SourceKind;
  readonly suggestedTitle: string;
  readonly pages: BuiltPages;
};

type SourceBuildError =
  | { readonly kind: 'nothing-usable' }
  | { readonly kind: 'unreadable'; readonly cause: string }
  | { readonly kind: 'empty' };

interface SourceBuilder {
  build(
    files: readonly File[],
    report: UploadReport,
  ): Promise<Result<BuiltSource, SourceBuildError>>;
}

export type { BuiltPages, BuiltSource, SourceBuildError, SourceBuilder };
