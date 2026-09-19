export type Trace = {
  step(name: string, detail: Record<string, unknown>): void;
  image(name: string, bitmap: ImageBitmap): void;
  end(): void;
};

export type TraceFactory = (label: string) => Trace;

const TRACE_IMAGE_EDGE = 320;

const BASE64_CHUNK = 0x8000;

export const NO_TRACE: Trace = {
  step: (): void => undefined,
  image: (): void => undefined,
  end: (): void => undefined,
};

export const noTrace: TraceFactory = () => NO_TRACE;

let opened = 0;

function base64Of(bytes: Uint8Array): string {
  let binary = '';
  for (let at = 0; at < bytes.length; at += BASE64_CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(at, at + BASE64_CHUNK));
  }
  return btoa(binary);
}

function copyOf(bitmap: ImageBitmap): OffscreenCanvas {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new Error(
      `A 2D drawing context was unavailable for a ${bitmap.width}x${bitmap.height} trace image`,
    );
  }

  context.drawImage(bitmap, 0, 0);
  return canvas;
}

async function dataUrlOf(canvas: OffscreenCanvas): Promise<string> {
  const blob = await canvas.convertToBlob();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return `data:${blob.type};base64,${base64Of(bytes)}`;
}

function styleFor(width: number, height: number, url: string): string {
  const scale = Math.min(1, TRACE_IMAGE_EDGE / Math.max(width, height, 1));
  const shownWidth = Math.max(1, Math.round(width * scale));
  const shownHeight = Math.max(1, Math.round(height * scale));

  return [
    `padding: ${shownHeight / 2}px ${shownWidth / 2}px`,
    `line-height: ${shownHeight}px`,
    `background-image: url(${url})`,
    `background-size: ${shownWidth}px ${shownHeight}px`,
    'background-repeat: no-repeat',
  ].join('; ');
}

export function beginTrace(label: string): Trace {
  if (!import.meta.env.DEV) return NO_TRACE;

  opened += 1;
  const scope = `${label} #${opened}`;
  const opening = `${scope} start`;
  let ended = false;

  performance.mark(opening);
  console.groupCollapsed(scope);

  return {
    step(name: string, detail: Record<string, unknown>): void {
      performance.mark(`${scope} ${name}`);
      console.log(name, detail);
    },

    image(name: string, bitmap: ImageBitmap): void {
      const width = bitmap.width;
      const height = bitmap.height;

      let copy: OffscreenCanvas;
      try {
        copy = copyOf(bitmap);
      } catch {
        return;
      }

      void dataUrlOf(copy).then(
        (url) => {
          console.log(
            `%c %c ${scope} · ${name} ${width}×${height}`,
            styleFor(width, height, url),
            '',
          );
        },
        () => undefined,
      );
    },

    end(): void {
      if (ended) return;
      ended = true;

      const closing = `${scope} end`;
      performance.mark(closing);
      performance.measure(scope, opening, closing);
      console.groupEnd();
    },
  };
}
