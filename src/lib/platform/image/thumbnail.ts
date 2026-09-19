import { describeCause } from '$lib/shared/cause';

const MIME_TYPE = 'image/webp';

const QUALITY = 0.8;

export async function renderThumbnail(bitmap: ImageBitmap, maxWidth: number): Promise<Blob> {
  const scale = Math.min(1, maxWidth / bitmap.width);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  try {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');
    if (context === null) throw new Error('A 2D drawing context was unavailable');
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await canvas.convertToBlob({ type: MIME_TYPE, quality: QUALITY });
    return blob;
  } catch (cause) {
    throw new Error(
      `A ${bitmap.width}x${bitmap.height} bitmap could not be scaled to ${width}x${height}: ${describeCause(cause)}`,
      { cause },
    );
  }
}
