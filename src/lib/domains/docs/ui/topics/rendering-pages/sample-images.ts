import { checkedResponse } from '$lib/platform/http/http-error';
import type { PixelSize } from '../../../domain/bitmap-memory';

type DrawnSample = { readonly size: PixelSize; readonly panels: number };

const SCAN: DrawnSample = { size: { width: 2000, height: 3000 }, panels: 5 };

const SLICE: DrawnSample = { size: { width: 1000, height: 20_000 }, panels: 12 };

const JPEG_QUALITY = 0.85;

const INK = '#1b1b1b';

const PAPER = '#f4f1ea';

function drawPanels(context: OffscreenCanvasRenderingContext2D, sample: DrawnSample): void {
  const { width, height } = sample.size;
  const margin = Math.round(width * 0.05);
  const gutter = Math.round(width * 0.02);
  const panelHeight = (height - margin * 2 - gutter * (sample.panels - 1)) / sample.panels;

  context.fillStyle = PAPER;
  context.fillRect(0, 0, width, height);
  context.lineWidth = Math.max(2, Math.round(width / 300));

  for (let panel = 0; panel < sample.panels; panel += 1) {
    const top = margin + panel * (panelHeight + gutter);
    const shade = context.createLinearGradient(margin, top, width - margin, top + panelHeight);
    shade.addColorStop(0, `hsl(${(panel * 47) % 360} 30% 82%)`);
    shade.addColorStop(1, `hsl(${(panel * 47 + 120) % 360} 25% 62%)`);
    context.fillStyle = shade;
    context.fillRect(margin, top, width - margin * 2, panelHeight);

    for (let line = 0; line < 60; line += 1) {
      const x = margin + ((line * 97) % (width - margin * 2));
      context.strokeStyle = `rgb(27 27 27 / ${0.08 + (line % 5) * 0.04})`;
      context.beginPath();
      context.moveTo(x, top);
      context.lineTo(x + panelHeight / 3, top + panelHeight);
      context.stroke();
    }

    context.fillStyle = '#ffffff';
    context.strokeStyle = INK;
    context.beginPath();
    context.ellipse(
      width - margin - width * 0.18,
      top + panelHeight * 0.3,
      width * 0.12,
      panelHeight * 0.2,
      0,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.stroke();
    context.strokeRect(margin, top, width - margin * 2, panelHeight);
  }
}

async function drawnJpeg(sample: DrawnSample): Promise<Blob> {
  const canvas = new OffscreenCanvas(sample.size.width, sample.size.height);
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new Error(
      `A ${sample.size.width}x${sample.size.height} canvas has no 2D context in this browser`,
    );
  }
  drawPanels(context, sample);
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });
  return blob;
}

async function bundledPage(url: string): Promise<Blob> {
  const response = await fetch(url);
  const blob = await checkedResponse(response, 'GET', url).blob();
  return blob;
}

export { SCAN, SLICE, bundledPage, drawnJpeg };
export type { DrawnSample };
