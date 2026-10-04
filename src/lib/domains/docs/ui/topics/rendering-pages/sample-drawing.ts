import { SAMPLE_PAGE_POINTS, renderedSize } from './render-scale';

const INK = '#1b1b1b';

const PAPER = '#ffffff';

const TONE = '#d9d4c8';

const FONT = 'system-ui, sans-serif';

function drawInstructions(context: CanvasRenderingContext2D): void {
  const { width, height } = SAMPLE_PAGE_POINTS;
  context.fillStyle = PAPER;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = INK;
  context.lineWidth = 1.5;
  context.fillStyle = INK;
  context.font = `600 15px ${FONT}`;
  context.fillText('Chapter 1', 36, 56);

  context.fillStyle = TONE;
  context.fillRect(24, 150, 312, 120);
  context.strokeRect(24, 150, 312, 120);
  context.strokeRect(24, 278, 150, 202);
  context.strokeRect(182, 278, 154, 202);

  context.fillStyle = PAPER;
  context.beginPath();
  context.ellipse(261, 86, 62, 42, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.fillStyle = INK;
  context.font = `8px ${FONT}`;
  context.textAlign = 'center';
  context.fillText('Small type is where', 261, 78);
  context.fillText('a low scale shows', 261, 89);
  context.fillText('first.', 261, 100);
  context.textAlign = 'start';

  context.fillStyle = PAPER;
  context.fillRect(34, 290, 132, 32);
  context.strokeRect(34, 290, 132, 32);
  context.fillStyle = INK;
  context.font = `7px ${FONT}`;
  context.fillText('The next morning, at the station.', 40, 309);

  context.save();
  context.beginPath();
  context.rect(182, 278, 154, 202);
  context.clip();
  context.lineWidth = 0.5;
  for (let line = 0; line < 32; line += 1) {
    context.beginPath();
    context.moveTo(186 + line * 6, 278);
    context.lineTo(186 + line * 6 - 40, 480);
    context.stroke();
  }
  context.restore();
}

function paintSamplePage(canvas: HTMLCanvasElement, scale: number): void {
  const size = renderedSize(scale);
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (context === null) return;
  context.setTransform(scale, 0, 0, scale, 0, 0);
  drawInstructions(context);
}

export { paintSamplePage };
