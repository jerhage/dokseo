import { describe, expect, it } from 'vitest';
import {
  advancedPayload,
  NO_PAYLOAD,
  payloadProgress,
  trackedPayload,
  type PayloadFile,
} from './payload-progress';

const REPO = 'https://huggingface.co/DigitalLarynx/manga-ocr-onnx/resolve/main';

const ENCODER = `${REPO}/onnx/encoder_model_quantized.onnx`;

const DECODER = `${REPO}/onnx/decoder_model_merged.onnx`;

function tracked(): readonly PayloadFile[] {
  const encoder = trackedPayload(NO_PAYLOAD, ENCODER, 86_967_767, 0);
  return trackedPayload(encoder, DECODER, 117_445_718, 0);
}

describe('payloadProgress', () => {
  it('totals only the files being transferred, never one merely probed', () => {
    const progress = payloadProgress(tracked(), 'network');

    expect(progress.totalBytes).toBe(204_413_485);
  });

  it('reports nothing loaded and no fraction before a file is registered', () => {
    const progress = payloadProgress(NO_PAYLOAD, 'cache');

    expect(progress).toEqual({ fraction: 0, source: 'cache', loadedBytes: 0, totalBytes: 0 });
  });

  it('counts the bytes already on disk against the total from the first frame', () => {
    const resumed = trackedPayload(tracked(), ENCODER, 86_967_767, 50_000_000);
    const progress = payloadProgress(resumed, 'network');

    expect(progress.loadedBytes).toBe(50_000_000);
    expect(progress.fraction).toBeCloseTo(50_000_000 / 204_413_485, 6);
  });

  it('adds each fetched read to the file it belongs to', () => {
    const advanced = advancedPayload(advancedPayload(tracked(), ENCODER, 1_000), DECODER, 2_000);

    expect(payloadProgress(advanced, 'network').loadedBytes).toBe(3_000);
  });

  it('registers a file once, so a retried transfer restates it rather than doubling it', () => {
    const restated = trackedPayload(tracked(), ENCODER, 86_967_767, 8_000_000);

    expect(payloadProgress(restated, 'network').totalBytes).toBe(204_413_485);
    expect(payloadProgress(restated, 'network').loadedBytes).toBe(8_000_000);
  });

  it('never reports more of a file than the file holds', () => {
    const overfed = advancedPayload(tracked(), ENCODER, 999_000_000);

    expect(payloadProgress(overfed, 'network').loadedBytes).toBe(86_967_767);
    expect(payloadProgress(overfed, 'network').fraction).toBeLessThan(1);
  });

  it('reaches every byte and a whole fraction when both files are complete', () => {
    const done = advancedPayload(
      advancedPayload(tracked(), ENCODER, 86_967_767),
      DECODER,
      117_445_718,
    );
    const progress = payloadProgress(done, 'network');

    expect(progress.loadedBytes).toBe(204_413_485);
    expect(progress.fraction).toBe(1);
  });
});
