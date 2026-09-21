import type { RecognizerDevice } from '$lib/domains/recognition/domain/engine/recognizer-session';

const FIRST_GPU_RUN_DEADLINE_MS = 15_000;

type OpenedOn<T> = {
  readonly opened: T;
  readonly device: RecognizerDevice;
  readonly fellBackFrom: RecognizerDevice | null;
};

type DeviceSession<Image, Text> = {
  readonly device: RecognizerDevice;
  read(image: Image): Promise<Text>;
};

type GuardedRun<Image, Text> = {
  readonly fallBack: () => Promise<DeviceSession<Image, Text>>;
  readonly deadlineMs?: number;
  readonly wait?: (ms: number) => Promise<void>;
};

type FirstRunGuard<Image, Text> = (
  session: DeviceSession<Image, Text>,
  image: Image,
) => Promise<Text>;

type FirstRun<Text> = { readonly ran: true; readonly text: Text } | { readonly ran: false };

async function openOnDevice<T>(
  device: RecognizerDevice,
  open: (on: RecognizerDevice) => Promise<T>,
): Promise<OpenedOn<T>> {
  if (device !== 'webgpu') {
    const opened = await open(device);
    return { opened, device, fellBackFrom: null };
  }

  try {
    const opened = await open('webgpu');
    return { opened, device: 'webgpu', fellBackFrom: null };
  } catch {
    const opened = await open('wasm');
    return { opened, device: 'wasm', fellBackFrom: 'webgpu' };
  }
}

async function reopenOnCpu<T>(open: (on: RecognizerDevice) => Promise<T>): Promise<OpenedOn<T>> {
  const opened = await open('wasm');
  return { opened, device: 'wasm', fellBackFrom: 'webgpu' };
}

function afterDelay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function firstRunOf<Text>(
  running: Promise<Text>,
  expiring: Promise<void>,
): Promise<FirstRun<Text>> {
  const settled = running.then(
    (text): FirstRun<Text> => ({ ran: true, text }),
    (): FirstRun<Text> => ({ ran: false }),
  );

  const expired = expiring.then((): FirstRun<Text> => ({ ran: false }));
  return await Promise.race([settled, expired]);
}

function guardFirstGpuRun<Image, Text>(run: GuardedRun<Image, Text>): FirstRunGuard<Image, Text> {
  const wait = run.wait ?? afterDelay;
  const deadline = run.deadlineMs ?? FIRST_GPU_RUN_DEADLINE_MS;

  let proven = false;
  let fallingBack: Promise<DeviceSession<Image, Text>> | null = null;

  return async (session, image) => {
    if (proven || session.device !== 'webgpu') return await session.read(image);

    const first = await firstRunOf(session.read(image), wait(deadline));
    if (first.ran) {
      proven = true;
      return first.text;
    }

    fallingBack ??= run.fallBack().catch((cause: unknown): never => {
      fallingBack = null;
      throw cause;
    });

    const cpu = await fallingBack;
    return await cpu.read(image);
  };
}

export { FIRST_GPU_RUN_DEADLINE_MS, guardFirstGpuRun, openOnDevice, reopenOnCpu };
export type { DeviceSession, FirstRunGuard, GuardedRun, OpenedOn };
