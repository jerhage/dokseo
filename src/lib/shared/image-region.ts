import type { ImageRect } from './geometry';
import type { ImageIndex } from './ids';

type ImageRegion = { readonly index: ImageIndex; readonly rect: ImageRect };

export type { ImageRegion };
