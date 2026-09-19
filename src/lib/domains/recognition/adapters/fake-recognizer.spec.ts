import { describe, expect, it } from 'vitest';
import { createFakeRecognizer } from './fake-recognizer';

type StubBitmap = { readonly bitmap: ImageBitmap; wasClosed(): boolean };

function stubBitmap(width: number, height: number): StubBitmap {
  let closed = false;
  const bitmap = {
    width,
    height,
    close: (): void => {
      closed = true;
    },
  } as unknown as ImageBitmap;

  return { bitmap, wasClosed: () => closed };
}

async function textOf(width: number, height: number): Promise<string> {
  const recognized = await createFakeRecognizer().recognize(stubBitmap(width, height).bitmap);
  if (!recognized.ok) throw new Error('The fake recognizer failed');
  return recognized.value.text;
}

describe('createFakeRecognizer', () => {
  it('names itself fake', () => {
    expect(createFakeRecognizer().id).toBe('fake');
  });

  it('returns the same text for the same dimensions', async () => {
    expect(await textOf(120, 48)).toBe(await textOf(120, 48));
  });

  it('returns different text for different dimensions', async () => {
    expect(await textOf(120, 48)).not.toBe(await textOf(240, 96));
  });

  it('returns text and no confidence', async () => {
    const recognized = await createFakeRecognizer().recognize(stubBitmap(300, 80).bitmap);
    if (!recognized.ok) throw new Error('The fake recognizer failed');
    expect(recognized.value.text.length).toBeGreaterThan(0);
    expect(recognized.value.confidence).toBeNull();
  });

  it('leaves the input bitmap open', async () => {
    const stub = stubBitmap(120, 48);
    await createFakeRecognizer().recognize(stub.bitmap);
    expect(stub.wasClosed()).toBe(false);
  });
});
