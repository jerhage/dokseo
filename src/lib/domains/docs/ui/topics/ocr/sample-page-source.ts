import { checkedResponse } from '$lib/platform/http/http-error';
import { describeCause } from '$lib/shared/cause';
import { imageIndex } from '$lib/shared/ids';
import type { ImageIndex } from '$lib/shared/ids';
import type { ImageRead, PageSource, PictureRead, SizesRead } from '$lib/shared/page-source';

const SAMPLE_PAGES = 1;

const FIRST_PAGE = imageIndex(0);

function samplePageSource(url: string): PageSource {
  let bytes: Promise<Blob> | null = null;

  function blob(): Promise<Blob> {
    bytes ??= fetch(url)
      .then((response) => checkedResponse(response, 'GET', url).blob())
      .catch((cause: unknown): never => {
        bytes = null;
        throw cause;
      });
    return bytes;
  }

  async function image(index: ImageIndex): Promise<ImageRead> {
    if (index !== FIRST_PAGE) return { kind: 'out-of-range', index, count: SAMPLE_PAGES };

    try {
      const decoded = await createImageBitmap(await blob());
      return { kind: 'success', image: decoded };
    } catch (cause) {
      return { kind: 'decode-failed', index, cause: describeCause(cause) };
    }
  }

  async function picture(index: ImageIndex): Promise<PictureRead> {
    if (index !== FIRST_PAGE) return { kind: 'out-of-range', index, count: SAMPLE_PAGES };
    return { kind: 'success', picture: { kind: 'encoded', url } };
  }

  async function sizes(): Promise<SizesRead> {
    const read = await image(FIRST_PAGE);
    if (read.kind !== 'success') return read;

    const size = { width: read.image.width, height: read.image.height };
    read.image.close();
    return { kind: 'success', sizes: [size] };
  }

  function close(): void {
    bytes = null;
  }

  return { count: SAMPLE_PAGES, image, picture, sizes, close, [Symbol.dispose]: close };
}

export { samplePageSource };
