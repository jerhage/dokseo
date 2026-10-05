import { match } from 'ts-pattern';
import type { DiagramBox, DiagramTone } from '$lib/ui/components/diagram';
import { pageRect } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import type { Anchor } from '$lib/shared/anchor';
import type { DiagramSpec } from '../testing/testing-diagrams';

type Narrowable = string | Date | Anchor | null;

type NarrowingCheck = 'null' | 'string' | 'date' | 'region';

type NarrowingEnd = 'null' | 'string' | 'date' | 'region' | 'text';

type NarrowingPath = {
  readonly passed: readonly NarrowingCheck[];
  readonly end: NarrowingEnd;
};

type SampleName = 'nothing' | 'text' | 'date' | 'region' | 'quote';

type NarrowingSample = {
  readonly name: SampleName;
  readonly label: string;
  readonly value: Narrowable;
};

const NARROWING_SAMPLES: readonly NarrowingSample[] = [
  { name: 'nothing', label: 'null', value: null },
  { name: 'text', label: 'A string', value: 'ありがとう' },
  { name: 'date', label: 'A Date', value: new Date(Date.UTC(2026, 9, 4)) },
  {
    name: 'region',
    label: 'A region anchor',
    value: regionAnchor([{ index: imageIndex(12), rect: pageRect(0.12, 0.05, 0.088, 0.2) }]),
  },
  {
    name: 'quote',
    label: 'A text anchor',
    value: textAnchor(
      '/6/4!/4/2/1:0',
      { exact: 'ありがとう', prefix: '', suffix: '。' },
      'Chapter 1',
    ),
  },
];

function narrowingPath(value: Narrowable): NarrowingPath {
  if (value === null) return { passed: [], end: 'null' };
  if (typeof value === 'string') return { passed: ['null'], end: 'string' };
  if (value instanceof Date) return { passed: ['null', 'string'], end: 'date' };
  if (value.kind === 'region') return { passed: ['null', 'string', 'date'], end: 'region' };
  return { passed: ['null', 'string', 'date', 'region'], end: 'text' };
}

function sampleNamed(name: SampleName): NarrowingSample {
  const sample = NARROWING_SAMPLES.find((candidate) => candidate.name === name);
  if (sample === undefined) throw new Error(`No narrowing sample is named ${name}`);
  return sample;
}

function shownSample(value: Narrowable): string {
  if (value instanceof Date) return `new Date('${value.toISOString()}')`;
  return JSON.stringify(value, null, 2);
}

const CHECK_WIDTH = 210;
const END_X = 240;
const END_WIDTH = 120;
const ROW_STEP = 72;
const BOX_HEIGHT = 44;

function row(index: number): number {
  return index * ROW_STEP;
}

function box(
  x: number,
  y: number,
  width: number,
  label: string,
  detail: string,
  tone: DiagramTone,
): DiagramBox {
  return { kind: 'box', x, y, width, height: BOX_HEIGHT, label, detail, tone };
}

function checkLabel(check: NarrowingCheck): { readonly label: string; readonly detail: string } {
  return match(check)
    .with('null', () => ({ label: 'value === null', detail: 'string | Date | Anchor | null' }))
    .with('string', () => ({
      label: "typeof value === 'string'",
      detail: 'string | Date | Anchor',
    }))
    .with('date', () => ({ label: 'value instanceof Date', detail: 'Date | Anchor' }))
    .with('region', () => ({ label: "value.kind === 'region'", detail: 'Anchor' }))
    .exhaustive();
}

function endLabel(end: NarrowingEnd): { readonly label: string; readonly detail: string } {
  return match(end)
    .with('null', () => ({ label: 'null', detail: 'nothing to read' }))
    .with('string', () => ({ label: 'string', detail: 'text methods' }))
    .with('date', () => ({ label: 'Date', detail: 'getTime() and more' }))
    .with('region', () => ({ label: "kind: 'region'", detail: '.regions' }))
    .with('text', () => ({ label: "kind: 'text'", detail: '.cfi, .quote' }))
    .exhaustive();
}

const CHECKS: readonly NarrowingCheck[] = ['null', 'string', 'date', 'region'];

function narrowingTree(path: NarrowingPath): DiagramSpec {
  const checks = CHECKS.map((check, index) => {
    const reached = index <= path.passed.length;
    const { label, detail } = checkLabel(check);
    return box(0, row(index), CHECK_WIDTH, label, detail, reached ? 'primary' : 'neutral');
  });
  const ends = CHECKS.map((check, index) => {
    const { label, detail } = endLabel(check);
    return box(
      END_X,
      row(index),
      END_WIDTH,
      label,
      detail,
      path.end === check ? 'accent' : 'neutral',
    );
  });
  const text = endLabel('text');
  const last = box(
    0,
    row(CHECKS.length),
    CHECK_WIDTH,
    text.label,
    `${text.detail}, the text variant`,
    path.end === 'text' ? 'accent' : 'neutral',
  );
  const downward = [...checks.slice(1), last];
  return {
    label:
      'A value of type string, Date, Anchor or null passes four checks in order. value === null leads to null; otherwise typeof value === string leads to string; otherwise value instanceof Date leads to Date; otherwise value.kind === region leads to the region anchor, and anything left is the text anchor. Each check narrows the type the next one receives.',
    width: END_X + END_WIDTH,
    height: row(CHECKS.length) + BOX_HEIGHT,
    nodes: [...checks, ...ends, last],
    edges: [
      ...checks.flatMap((check, index) => {
        const end = ends[index];
        return end === undefined ? [] : [{ from: check, to: end, label: 'yes' }];
      }),
      ...checks.flatMap((check, index) => {
        const next = downward[index];
        return next === undefined ? [] : [{ from: check, to: next, label: 'no' }];
      }),
    ],
  };
}

export { NARROWING_SAMPLES, narrowingPath, narrowingTree, sampleNamed, shownSample };
export type {
  Narrowable,
  NarrowingCheck,
  NarrowingEnd,
  NarrowingPath,
  NarrowingSample,
  SampleName,
};
