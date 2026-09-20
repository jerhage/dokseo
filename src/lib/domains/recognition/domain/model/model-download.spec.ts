import { describe, expect, it } from 'vitest';
import { downloadStep, IDLE, isRunning, type DownloadState } from './model-download';
import type { ModelLoad } from './model-load';
import type { RecognizerSession } from '../engine/recognizer-session';

const SESSION: RecognizerSession = { modelId: 'DigitalLarynx/manga-ocr-onnx', device: 'webgpu' };

const HALFWAY: ModelLoad = {
  fraction: 0.5,
  source: 'network',
  loadedBytes: 105_000_000,
  totalBytes: 211_000_000,
};

function loading(): DownloadState {
  return downloadStep(IDLE, { kind: 'started' });
}

describe('downloadStep', () => {
  it('starts with no progress reported yet, so nothing claims a percentage', () => {
    expect(loading()).toEqual({ kind: 'loading', load: null });
    expect(isRunning(loading())).toBe(true);
  });

  it('records the newest load while the download runs', () => {
    expect(downloadStep(loading(), { kind: 'advanced', load: HALFWAY })).toEqual({
      kind: 'loading',
      load: HALFWAY,
    });
  });

  it('settles as ready when the session opens', () => {
    expect(downloadStep(loading(), { kind: 'opened', session: SESSION })).toEqual({
      kind: 'ready',
      session: SESSION,
    });
  });

  it('settles as cancelled when the reader stops it', () => {
    expect(downloadStep(loading(), { kind: 'stopped' })).toEqual({ kind: 'cancelled' });
  });

  it('holds the last reported load when the reader pauses it', () => {
    const running = downloadStep(loading(), { kind: 'advanced', load: HALFWAY });

    expect(downloadStep(running, { kind: 'held' })).toEqual({ kind: 'paused', load: HALFWAY });
  });

  it('ignores progress that arrives after the reader paused', () => {
    const paused = downloadStep(loading(), { kind: 'held' });

    expect(downloadStep(paused, { kind: 'advanced', load: HALFWAY })).toEqual(paused);
  });

  it('leaves a paused load paused when the cancelled load finally settles', () => {
    const paused = downloadStep(loading(), { kind: 'held' });
    const settled = downloadStep(paused, { kind: 'settled', error: { kind: 'cancelled' } });

    expect(settled).toEqual(paused);
  });

  it('settles as failed and keeps the cause', () => {
    const failed = downloadStep(loading(), {
      kind: 'settled',
      error: { kind: 'unavailable', cause: 'the weights 404ed' },
    });

    expect(failed).toEqual({ kind: 'failed', cause: 'the weights 404ed' });
  });

  it('settles as cancelled when the load reports it was cancelled', () => {
    const stopped = downloadStep(loading(), { kind: 'settled', error: { kind: 'cancelled' } });
    expect(stopped).toEqual({ kind: 'cancelled' });
  });

  it('ignores progress that arrives before anything was started', () => {
    expect(downloadStep(IDLE, { kind: 'advanced', load: HALFWAY })).toEqual(IDLE);
  });

  it('ignores progress that arrives after the download was cancelled', () => {
    const cancelled = downloadStep(loading(), { kind: 'stopped' });
    expect(downloadStep(cancelled, { kind: 'advanced', load: HALFWAY })).toEqual(cancelled);
  });

  it('stays cancelled when the terminated worker still reports a session', () => {
    const cancelled = downloadStep(loading(), { kind: 'stopped' });
    expect(downloadStep(cancelled, { kind: 'opened', session: SESSION })).toEqual(cancelled);
  });

  it('ignores a cancel that arrives once the session is already open', () => {
    const ready = downloadStep(loading(), { kind: 'opened', session: SESSION });
    expect(downloadStep(ready, { kind: 'stopped' })).toEqual(ready);
  });

  it('restarts from a failure with no progress carried over', () => {
    const failed = downloadStep(loading(), {
      kind: 'settled',
      error: { kind: 'unavailable', cause: 'the weights 404ed' },
    });

    expect(downloadStep(failed, { kind: 'started' })).toEqual({ kind: 'loading', load: null });
  });
});
