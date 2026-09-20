import type { Result } from '$lib/shared/result';
import type { SourceKind } from '../book/book';
import type { UploadReport } from './upload-progress';

type BuiltSource = {
  readonly blob: Blob;
  readonly sourceKind: SourceKind;
  readonly imageCount: number;
  readonly cover: Blob;
  readonly suggestedTitle: string;
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

export type { BuiltSource, SourceBuildError, SourceBuilder };
