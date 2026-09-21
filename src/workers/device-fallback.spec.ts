import { describe, expect, it } from 'vitest';
import type { RecognizerDevice } from '$lib/domains/recognition/domain/engine/recognizer-session';
import {
  FIRST_GPU_RUN_DEADLINE_MS,
  guardFirstGpuRun,
  openOnDevice,
  reopenOnCpu,
} from './device-fallback';
import type { DeviceSession } from './device-fallback';

type Opener = {
  readonly asked: RecognizerDevice[];
  open(on: RecognizerDevice): Promise<string>;
};

function opener(refusing: readonly RecognizerDevice[]): Opener {
  const asked: RecognizerDevice[] = [];

  return {
    asked,
    open: (on: RecognizerDevice): Promise<string> => {
      asked.push(on);
      return refusing.includes(on)
        ? Promise.reject(new Error(`${on} would not open the model`))
        : Promise.resolve(`a session on ${on}`);
    },
  };
}

describe('openOnDevice', () => {
  it('reports no fallback when the GPU opens the model', async () => {
    const gpu = opener([]);
    const running = await openOnDevice('webgpu', gpu.open);

    expect(running).toEqual({
      opened: 'a session on webgpu',
      device: 'webgpu',
      fellBackFrom: null,
    });
  });

  it('opens on the CPU when the GPU throws, and says which device refused', async () => {
    const refused = opener(['webgpu']);
    const running = await openOnDevice('webgpu', refused.open);

    expect(running).toEqual({
      opened: 'a session on wasm',
      device: 'wasm',
      fellBackFrom: 'webgpu',
    });
  });

  it('retries once, and only on the CPU', async () => {
    const refused = opener(['webgpu']);
    await openOnDevice('webgpu', refused.open);

    expect(refused.asked).toEqual(['webgpu', 'wasm']);
  });

  it('never reaches for the GPU when the CPU was the device', async () => {
    const cpu = opener(['webgpu']);
    const running = await openOnDevice('wasm', cpu.open);

    expect(running).toEqual({ opened: 'a session on wasm', device: 'wasm', fellBackFrom: null });
    expect(cpu.asked).toEqual(['wasm']);
  });

  it('throws the CPU failure when neither device opens the model', async () => {
    const broken = opener(['webgpu', 'wasm']);

    await expect(openOnDevice('webgpu', broken.open)).rejects.toThrow(
      'wasm would not open the model',
    );
  });
});

type Crops = {
  readonly crops: string[];
  readonly session: DeviceSession<string, string>;
};

type Deadline = {
  readonly asked: number[];
  expire(): void;
  wait(ms: number): Promise<void>;
};

type Held = {
  readonly running: Promise<string>;
  settle(text: string): void;
  fail(cause: Error): void;
};

function reading(device: RecognizerDevice, answer: (crop: string) => Promise<string>): Crops {
  const crops: string[] = [];

  return {
    crops,
    session: {
      device,
      read: (crop: string): Promise<string> => {
        crops.push(crop);
        return answer(crop);
      },
    },
  };
}

function deadline(): Deadline {
  const asked: number[] = [];
  let reached: () => void = () => undefined;

  return {
    asked,
    expire: (): void => {
      reached();
    },
    wait: (ms: number): Promise<void> => {
      asked.push(ms);
      return new Promise<void>((resolve) => {
        reached = resolve;
      });
    },
  };
}

function held(): Held {
  let settle: (text: string) => void = () => undefined;
  let fail: (cause: Error) => void = () => undefined;

  const running = new Promise<string>((resolve, reject) => {
    settle = resolve;
    fail = reject;
  });

  return { running, settle: (text) => settle(text), fail: (cause) => fail(cause) };
}

async function flushed(): Promise<void> {
  for (let turn = 0; turn < 4; turn += 1) await Promise.resolve();
}

describe('guardFirstGpuRun', () => {
  it('answers with the GPU text and never falls back when the first run succeeds', async () => {
    const gpu = reading('webgpu', (crop) => Promise.resolve(`${crop} read on the GPU`));
    const clock = deadline();
    let fallBacks = 0;

    const read = guardFirstGpuRun<string, string>({
      wait: clock.wait,
      fallBack: () => {
        fallBacks += 1;
        return Promise.resolve(reading('wasm', () => Promise.resolve('')).session);
      },
    });

    await expect(read(gpu.session, 'a crop')).resolves.toBe('a crop read on the GPU');
    expect(fallBacks).toBe(0);
  });

  it('times only the first GPU run', async () => {
    const gpu = reading('webgpu', (crop) => Promise.resolve(`${crop} read on the GPU`));
    const clock = deadline();
    const read = guardFirstGpuRun<string, string>({
      wait: clock.wait,
      fallBack: () => Promise.reject(new Error('nothing should reopen the model')),
    });

    await read(gpu.session, 'one crop');
    await read(gpu.session, 'another crop');

    expect(clock.asked).toEqual([FIRST_GPU_RUN_DEADLINE_MS]);
  });

  it('never times a session that is already on the CPU', async () => {
    const cpu = reading('wasm', (crop) => Promise.resolve(`${crop} read on the CPU`));
    const clock = deadline();
    const read = guardFirstGpuRun<string, string>({
      wait: clock.wait,
      fallBack: () => Promise.reject(new Error('nothing should reopen the model')),
    });

    await expect(read(cpu.session, 'a crop')).resolves.toBe('a crop read on the CPU');
    expect(clock.asked).toEqual([]);
  });

  it('retries the crop on the CPU when the first GPU run fails', async () => {
    const gpu = reading('webgpu', () => Promise.reject(new Error('OrtRun would not download')));
    const cpu = reading('wasm', (crop) => Promise.resolve(`${crop} read on the CPU`));
    const read = guardFirstGpuRun<string, string>({
      wait: deadline().wait,
      fallBack: () => Promise.resolve(cpu.session),
    });

    await expect(read(gpu.session, 'a crop')).resolves.toBe('a crop read on the CPU');
    expect(cpu.crops).toEqual(['a crop']);
  });

  it('retries the crop on the CPU when the first GPU run outlives the deadline', async () => {
    const hanging = held();
    const gpu = reading('webgpu', () => hanging.running);
    const cpu = reading('wasm', (crop) => Promise.resolve(`${crop} read on the CPU`));
    const clock = deadline();
    const read = guardFirstGpuRun<string, string>({
      wait: clock.wait,
      fallBack: () => Promise.resolve(cpu.session),
    });

    const answer = read(gpu.session, 'a crop');
    clock.expire();

    await expect(answer).resolves.toBe('a crop read on the CPU');
    expect(clock.asked).toEqual([FIRST_GPU_RUN_DEADLINE_MS]);
  });

  it('ignores a GPU run that answers after the deadline', async () => {
    const abandoned = held();
    const gpu = reading('webgpu', () => abandoned.running);
    const cpu = reading('wasm', (crop) => Promise.resolve(`${crop} read on the CPU`));
    const clock = deadline();
    const read = guardFirstGpuRun<string, string>({
      wait: clock.wait,
      fallBack: () => Promise.resolve(cpu.session),
    });

    const answer = read(gpu.session, 'a crop');
    clock.expire();
    await flushed();
    abandoned.settle('a crop read late on the GPU');

    await expect(answer).resolves.toBe('a crop read on the CPU');
    expect(cpu.crops).toEqual(['a crop']);
  });

  it('ignores a GPU run that fails after the deadline', async () => {
    const abandoned = held();
    const gpu = reading('webgpu', () => abandoned.running);
    const cpu = reading('wasm', (crop) => Promise.resolve(`${crop} read on the CPU`));
    const clock = deadline();
    const read = guardFirstGpuRun<string, string>({
      wait: clock.wait,
      fallBack: () => Promise.resolve(cpu.session),
    });

    const answer = read(gpu.session, 'a crop');
    clock.expire();
    await flushed();
    abandoned.fail(new Error('OrtRun failed long after nobody was waiting'));

    await expect(answer).resolves.toBe('a crop read on the CPU');
    await flushed();
  });

  it('reopens the model once for two crops the GPU would not run', async () => {
    const gpu = reading('webgpu', () => Promise.reject(new Error('OrtRun would not download')));
    const cpu = reading('wasm', (crop) => Promise.resolve(`${crop} read on the CPU`));
    let reopens = 0;

    const read = guardFirstGpuRun<string, string>({
      wait: deadline().wait,
      fallBack: () => {
        reopens += 1;
        return Promise.resolve(cpu.session);
      },
    });

    await Promise.all([read(gpu.session, 'one crop'), read(gpu.session, 'another crop')]);

    expect(reopens).toBe(1);
    expect(cpu.crops).toEqual(['one crop', 'another crop']);
  });

  it('reports the retry failure when the CPU cannot read the crop either', async () => {
    const gpu = reading('webgpu', () => Promise.reject(new Error('OrtRun would not download')));
    const cpu = reading('wasm', () => Promise.reject(new Error('the CPU could not read the crop')));
    const read = guardFirstGpuRun<string, string>({
      wait: deadline().wait,
      fallBack: () => Promise.resolve(cpu.session),
    });

    await expect(read(gpu.session, 'a crop')).rejects.toThrow('the CPU could not read the crop');
  });

  it('reports the reopen failure when the model will not open on the CPU', async () => {
    const gpu = reading('webgpu', () => Promise.reject(new Error('OrtRun would not download')));
    const read = guardFirstGpuRun<string, string>({
      wait: deadline().wait,
      fallBack: () => Promise.reject(new Error('the model would not open on the CPU')),
    });

    await expect(read(gpu.session, 'a crop')).rejects.toThrow(
      'the model would not open on the CPU',
    );
  });
});

describe('reopenOnCpu', () => {
  it('opens on the CPU and names the GPU as the device it fell back from', async () => {
    const refused = opener(['webgpu']);
    const running = await reopenOnCpu(refused.open);

    expect(running).toEqual({
      opened: 'a session on wasm',
      device: 'wasm',
      fellBackFrom: 'webgpu',
    });
    expect(refused.asked).toEqual(['wasm']);
  });
});
