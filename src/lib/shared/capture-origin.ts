type CaptureOrigin = 'recognized' | 'written' | 'lifted';

const CAPTURE_ORIGINS: readonly CaptureOrigin[] = ['recognized', 'written', 'lifted'];

function isCaptureOrigin(value: unknown): value is CaptureOrigin {
  return CAPTURE_ORIGINS.some((origin) => origin === value);
}

export { isCaptureOrigin };
export type { CaptureOrigin };
