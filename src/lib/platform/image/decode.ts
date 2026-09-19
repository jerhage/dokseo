import { describeCause } from '$lib/shared/cause';

export async function decodeImage(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob);
  } catch (cause) {
    const kind = blob.type.length > 0 ? blob.type : 'unknown type';
    throw new Error(
      `A blob of ${blob.size} bytes (${kind}) could not be decoded as an image: ${describeCause(cause)}`,
      { cause },
    );
  }
}
