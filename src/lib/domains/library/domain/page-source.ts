import type { ImageIndex } from '$lib/shared/ids';
import type { Result } from '$lib/shared/result';

export type PageSourceError =
	| { readonly kind: 'out-of-range'; readonly index: number; readonly count: number }
	| { readonly kind: 'decode-failed'; readonly index: number; readonly cause: string }
	| { readonly kind: 'source-unreadable'; readonly cause: string };

export interface PageSource {
	readonly count: number;
	image(index: ImageIndex): Promise<Result<ImageBitmap, PageSourceError>>;
	close(): void;
	[Symbol.dispose](): void;
}
