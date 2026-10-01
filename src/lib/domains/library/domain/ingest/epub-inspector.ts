import type { EpubInspectionAnswer } from './epub-inspection';

type EpubInspector = (source: Blob) => Promise<EpubInspectionAnswer>;

export type { EpubInspector };
