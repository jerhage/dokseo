import type { Result } from '$lib/shared/result';
import type { SourceKind } from './book';
import type { UploadReport } from './upload-progress';

export type BuiltSource = {
  readonly blob: Blob;
  readonly sourceKind: SourceKind;
  readonly imageCount: number;
  readonly cover: Blob;
  readonly suggestedTitle: string;
};

export type SourceBuildError =
  | { readonly kind: 'nothing-usable' }
  | { readonly kind: 'unreadable'; readonly cause: string }
  | { readonly kind: 'empty' };

export interface SourceBuilder {
  build(
    files: readonly File[],
    report: UploadReport,
  ): Promise<Result<BuiltSource, SourceBuildError>>;
}
