import { describe, expect, it } from 'vitest';
import { downloadMb, JAPANESE_OCR_MODEL, KOREAN_OCR_MODEL } from './model-footprint';
import { loadVerb, type ModelLoad } from './model-load';
import {
  engineMismatch,
  engineStatus,
  NOT_INSTALLED,
  OCR_ENGINES,
  ON_DEVICE_ENGINE,
  tradeOffsOf,
  type EngineState,
} from './ocr-engine';
import type { RecognizerSession } from './recognizer-session';

const ON_THE_GPU: RecognizerSession = {
  modelId: JAPANESE_OCR_MODEL.modelId,
  device: 'webgpu',
};

const ON_THE_CPU: RecognizerSession = {
  modelId: JAPANESE_OCR_MODEL.modelId,
  device: 'wasm',
};

function load(over: Partial<ModelLoad> = {}): ModelLoad {
  return { fraction: 0.5, source: 'network', loadedBytes: 0, totalBytes: 0, ...over };
}

function state(over: Partial<EngineState> = {}): EngineState {
  return {
    stored: false,
    opening: false,
    load: null,
    session: null,
    failure: null,
    paused: false,
    cancelled: false,
    partlyDownloaded: false,
    ...over,
  };
}

describe('engineStatus', () => {
  it('reports weights that are not here as not downloaded', () => {
    expect(engineStatus(state()).label).toBe('Not downloaded');
  });

  it('reports weights on this device as downloaded even while nothing runs', () => {
    const status = engineStatus(state({ stored: true }));

    expect(status.label).toBe('Downloaded');
    expect(status.note).toContain('on this device');
  });

  it('gives the weights and the running engine two different words', () => {
    const onDisk = engineStatus(state({ stored: true }));
    const running = engineStatus(state({ stored: true, session: ON_THE_GPU }));

    expect(onDisk.label).not.toBe(running.label);
    expect(onDisk.label).not.toBe(engineStatus(state()).label);
  });

  it('names the device an open session is running on', () => {
    expect(engineStatus(state({ stored: true, session: ON_THE_GPU })).note).toContain('GPU');
    expect(engineStatus(state({ stored: true, session: ON_THE_CPU })).note).toContain('CPU');
  });

  it('reports an engine that is starting without claiming a download', () => {
    const status = engineStatus(state({ stored: true, opening: true }));

    expect(status.label).toBe('Opening');
    expect(status.tone).toBe('busy');
    expect(status.note).toContain('Nothing is being downloaded');
  });

  it('reports a cached load with the neutral word rather than the download word', () => {
    const status = engineStatus(
      state({ stored: true, opening: true, load: load({ source: 'cache' }) }),
    );

    expect(status.label).toBe('Loading');
    expect(status.note).toContain('Nothing is being fetched');
  });

  it('reports a fetched load as downloading', () => {
    expect(engineStatus(state({ opening: true, load: load({ source: 'network' }) })).label).toBe(
      'Downloading',
    );
  });

  it('uses the same verb for a load as the capture panel does', () => {
    for (const source of ['cache', 'network'] as const) {
      expect(engineStatus(state({ opening: true, load: load({ source }) })).label).toBe(
        loadVerb(source),
      );
    }
  });

  it('reports a paused load as paused, and says the fetched bytes are kept', () => {
    const status = engineStatus(state({ paused: true }));

    expect(status.label).toBe('Paused');
    expect(status.note).toContain('Resuming');
  });

  it('says a cancelled load discarded the part-downloaded file', () => {
    expect(engineStatus(state({ cancelled: true })).note).toContain('discarded');
  });

  it('reports a cancelled load as cancelled rather than as missing weights', () => {
    expect(engineStatus(state({ stored: true, cancelled: true })).label).toBe('Cancelled');
  });

  it('reports a failure ahead of the weights it still holds', () => {
    const status = engineStatus(state({ stored: true, failure: 'the worker died' }));

    expect(status.tone).toBe('bad');
    expect(status.note).toContain('the worker died');
  });
});

describe('OCR_ENGINES', () => {
  it('offers the on-device engine and nothing else that is installed', () => {
    expect(OCR_ENGINES.filter((engine) => engine.installed)).toEqual([ON_DEVICE_ENGINE]);
  });

  it('lists the two engines nobody has built as not installed', () => {
    expect(OCR_ENGINES.filter((engine) => !engine.installed).map((engine) => engine.id)).toEqual([
      'ocr-server',
      'openai-endpoint',
    ]);
  });

  it('says an engine that is not installed cannot be chosen', () => {
    expect(NOT_INSTALLED.note).toContain('cannot be chosen');
  });
});

describe('tradeOffsOf', () => {
  it('weighs every engine on the same four axes', () => {
    for (const engine of OCR_ENGINES) {
      expect(tradeOffsOf(engine.id, JAPANESE_OCR_MODEL).map((trade) => trade.aspect)).toEqual([
        'privacy',
        'cost',
        'setup',
        'quality',
      ]);
    }
  });

  it('quotes the download the footprint records rather than a figure from a brief', () => {
    const setup = tradeOffsOf('on-device', JAPANESE_OCR_MODEL).find(
      (trade) => trade.aspect === 'setup',
    );

    expect(setup?.value).toBe(`${downloadMb(JAPANESE_OCR_MODEL)} MB download, once`);
  });

  it('names a download without a size when no model has been chosen', () => {
    const setup = tradeOffsOf('on-device', null).find((trade) => trade.aspect === 'setup');

    expect(setup?.value).toBe('A model download, once');
  });

  it('counts privacy in favour of the on-device engine and against the other two', () => {
    const privacyOf = (engine: 'on-device' | 'ocr-server' | 'openai-endpoint'): string =>
      tradeOffsOf(engine, JAPANESE_OCR_MODEL).find((trade) => trade.aspect === 'privacy')
        ?.verdict ?? 'missing';

    expect(privacyOf('on-device')).toBe('good');
    expect(privacyOf('ocr-server')).toBe('caveat');
    expect(privacyOf('openai-endpoint')).toBe('caveat');
  });

  it('quotes no price and no per-bubble timing for any engine', () => {
    for (const engine of OCR_ENGINES) {
      for (const trade of tradeOffsOf(engine.id, JAPANESE_OCR_MODEL)) {
        expect(trade.value).not.toMatch(/\$/);
        expect(trade.value).not.toMatch(/per bubble/i);
      }
    }
  });
});

describe('engineStatus', () => {
  it('calls a model whose weights are incomplete part-downloaded, not downloaded', () => {
    const status = engineStatus(state({ stored: false, partlyDownloaded: true }));

    expect(status.label).toBe('Part-downloaded');
    expect(status.note).toContain('Resuming');
  });

  it('prefers the paused word over the part-downloaded one, because pausing is the newer fact', () => {
    const status = engineStatus(state({ paused: true, partlyDownloaded: true }));

    expect(status.label).toBe('Paused');
  });
});

describe('engineMismatch', () => {
  const japanese: RecognizerSession = { modelId: JAPANESE_OCR_MODEL.modelId, device: 'wasm' };

  it('says so when the running model cannot read the book in front of the reader', () => {
    expect(engineMismatch(japanese, 'ko')).toContain(JAPANESE_OCR_MODEL.label);
  });

  it('names the language the model cannot read, not the one it can', () => {
    expect(engineMismatch(japanese, 'ko')).toContain('Korean');
  });

  it('says nothing when the running model declares the language of the book', () => {
    expect(engineMismatch(japanese, 'ja')).toBeNull();
    expect(engineMismatch({ modelId: KOREAN_OCR_MODEL.modelId, device: 'wasm' }, 'ko')).toBeNull();
  });

  it('says nothing about a model nobody measured, because nothing declares what it reads', () => {
    expect(engineMismatch({ modelId: 'someone/unmeasured', device: 'wasm' }, 'ko')).toBeNull();
  });

  it('says nothing before an engine is running', () => {
    expect(engineMismatch(null, 'ko')).toBeNull();
    expect(engineMismatch(japanese, null)).toBeNull();
  });
});
