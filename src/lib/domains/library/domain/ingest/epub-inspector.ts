import type { Result } from '$lib/shared/result';
import type { EpubInspection, EpubInspectionError } from './epub-inspection';

type EpubInspector = (source: Blob) => Promise<Result<EpubInspection, EpubInspectionError>>;

export type { EpubInspector };
