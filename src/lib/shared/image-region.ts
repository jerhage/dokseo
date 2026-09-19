import type { ImageRect } from './geometry';
import type { ImageIndex } from './ids';

export type ImageRegion = { readonly index: ImageIndex; readonly rect: ImageRect };
