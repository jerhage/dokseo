import type { Emphasis } from './emphasis';

function lastStep(count: number): number {
  return Math.max(0, count - 1);
}

function clampStep(index: number, count: number): number {
  return Math.min(Math.max(0, Math.trunc(index)), lastStep(count));
}

function stepEmphasis(index: number, current: number): Emphasis {
  return index === current ? 'active' : 'dimmed';
}

function stepCounter(index: number, count: number): string {
  return `Step ${index + 1} of ${count}`;
}

export { clampStep, lastStep, stepCounter, stepEmphasis };
