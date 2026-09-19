import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { beginTrace, NO_TRACE } from './pipeline-trace';

const drawn: ImageBitmap[] = [];

class FakeOffscreenCanvas {
  readonly width: number;
  readonly height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  getContext(): { drawImage: (bitmap: ImageBitmap) => void } {
    return {
      drawImage: (bitmap: ImageBitmap): void => {
        drawn.push(bitmap);
      },
    };
  }

  convertToBlob(): Promise<Blob> {
    return Promise.resolve(new Blob(['png'], { type: 'image/png' }));
  }
}

function installCanvas(): void {
  vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas);
}

function stubBitmap() {
  const close = vi.fn();
  const bitmap = { width: 40, height: 20, close } as unknown as ImageBitmap;
  return { bitmap, close };
}

function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function loggedStyle(): string {
  const call = vi.mocked(console.log).mock.calls.at(-1) ?? [];
  return String(call[1]);
}

beforeEach(() => {
  drawn.length = 0;
  vi.spyOn(console, 'groupCollapsed').mockImplementation(() => undefined);
  vi.spyOn(console, 'groupEnd').mockImplementation(() => undefined);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(performance, 'mark').mockImplementation(() => ({}) as PerformanceMark);
  vi.spyOn(performance, 'measure').mockImplementation(() => ({}) as PerformanceMeasure);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('NO_TRACE', () => {
  it('writes nothing to the console', () => {
    NO_TRACE.step('region', { order: 0 });
    NO_TRACE.image('crop', stubBitmap().bitmap);
    NO_TRACE.end();

    expect(console.groupCollapsed).not.toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalled();
    expect(console.groupEnd).not.toHaveBeenCalled();
  });

  it('marks nothing on the performance timeline', () => {
    NO_TRACE.step('region', { order: 0 });
    NO_TRACE.end();

    expect(performance.mark).not.toHaveBeenCalled();
    expect(performance.measure).not.toHaveBeenCalled();
  });

  it('leaves the bitmap open', () => {
    const { bitmap, close } = stubBitmap();

    NO_TRACE.image('crop', bitmap);

    expect(close).not.toHaveBeenCalled();
  });
});

describe('beginTrace', () => {
  it('opens a collapsed group under its label', () => {
    const trace = beginTrace('crop');
    trace.end();

    expect(console.groupCollapsed).toHaveBeenCalledTimes(1);
    expect(vi.mocked(console.groupCollapsed).mock.calls[0]?.[0]).toContain('crop');
  });

  it('closes the group exactly once', () => {
    const trace = beginTrace('crop');

    trace.end();
    trace.end();

    expect(console.groupEnd).toHaveBeenCalledTimes(1);
  });

  it('logs a step with its detail', () => {
    const trace = beginTrace('crop');
    trace.step('region', { order: 0, width: 12 });
    trace.end();

    expect(console.log).toHaveBeenCalledWith('region', { order: 0, width: 12 });
  });

  it('marks the opening, each step and the close', () => {
    const trace = beginTrace('crop');
    trace.step('region', {});
    trace.step('stitched', {});
    trace.end();

    expect(performance.mark).toHaveBeenCalledTimes(4);
  });

  it('measures from the opening mark to the closing mark', () => {
    const trace = beginTrace('crop');
    trace.end();

    const [name, from, to] = vi.mocked(performance.measure).mock.calls[0] ?? [];
    expect(performance.measure).toHaveBeenCalledTimes(1);
    expect(from).toBe(`${String(name)} start`);
    expect(to).toBe(`${String(name)} end`);
  });

  it('names two traces apart', () => {
    const first = beginTrace('crop');
    const second = beginTrace('crop');
    first.end();
    second.end();

    const names = vi.mocked(console.groupCollapsed).mock.calls.map((call) => call[0]);
    expect(new Set(names).size).toBe(2);
  });

  it('leaves the bitmap open after showing it', async () => {
    installCanvas();
    const { bitmap, close } = stubBitmap();

    const trace = beginTrace('crop');
    trace.image('crop', bitmap);
    trace.end();
    await settle();

    expect(drawn).toEqual([bitmap]);
    expect(close).not.toHaveBeenCalled();
  });

  it('logs the image as a sized background', async () => {
    installCanvas();

    const trace = beginTrace('crop');
    trace.image('crop', stubBitmap().bitmap);
    trace.end();
    await settle();

    expect(loggedStyle()).toContain('background-image: url(data:image/png;base64,');
    expect(loggedStyle()).toContain('background-size: 40px 20px');
  });

  it('reports nothing when no drawing surface exists', async () => {
    const { bitmap, close } = stubBitmap();
    const trace = beginTrace('crop');

    expect(() => trace.image('crop', bitmap)).not.toThrow();
    trace.end();
    await settle();

    expect(close).not.toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalled();
  });
});
