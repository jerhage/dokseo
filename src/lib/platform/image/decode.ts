import { describeCause } from '$lib/shared/cause';

async function decodeImage(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch (cause) {
    const kind = blob.type.length > 0 ? blob.type : 'unknown type';
    throw new Error(
      `A blob of ${blob.size} bytes (${kind}) could not be decoded as an image: ${describeCause(cause)}`,
      { cause },
    );
  }
}

const VECTOR_MEDIA_TYPE = 'image/svg+xml';

async function drawnElement(url: string): Promise<HTMLImageElement> {
  const element = new Image();
  element.src = url;
  await element.decode();
  return element;
}

async function decodeVectorImage(blob: Blob): Promise<ImageBitmap> {
  const url = URL.createObjectURL(blob);
  try {
    const element = await drawnElement(url);
    const bitmap = await createImageBitmap(element);
    return bitmap;
  } catch (cause) {
    throw new Error(
      `A vector image of ${blob.size} bytes could not be drawn: ${describeCause(cause)}`,
      { cause },
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function decodeAnyImage(blob: Blob): Promise<ImageBitmap> {
  if (blob.type.trim().toLowerCase() !== VECTOR_MEDIA_TYPE) {
    const bitmap = await decodeImage(blob);
    return bitmap;
  }
  const bitmap = await decodeVectorImage(blob);
  return bitmap;
}

export { decodeAnyImage, decodeImage };
