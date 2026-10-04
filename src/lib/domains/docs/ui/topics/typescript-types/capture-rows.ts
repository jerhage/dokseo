import { match } from 'ts-pattern';
import {
  captureFromStored,
  capturesFromStored,
} from '$lib/domains/recognition/domain/capture/capture';
import type { Capture, StoredCapture } from '$lib/domains/recognition/domain/capture/capture';
import { describeCause } from '$lib/shared/cause';
import { isStoredFields } from '$lib/shared/corrupt-row';

type RowDamage =
  | 'none'
  | 'origin-missing'
  | 'written-confidence'
  | 'note-missing'
  | 'region-x-text'
  | 'tag-number'
  | 'anchor-kind'
  | 'anchor-text'
  | 'text-missing'
  | 'id-missing';

type DamageOption = { readonly damage: RowDamage; readonly label: string };

type CaptureRowCheck =
  | { readonly kind: 'read'; readonly capture: Capture; readonly defaults: readonly string[] }
  | { readonly kind: 'set-aside'; readonly id: string; readonly reason: string }
  | { readonly kind: 'listing-fails'; readonly reason: string }
  | { readonly kind: 'not-a-row'; readonly reason: string };

const STORED_CAPTURE = {
  id: 'c-41',
  bookId: 'b7f3c2a0-5d1e-4c8a-9f2b-1e6d3a4c5b70',
  origin: 'recognized',
  anchor: {
    kind: 'region',
    regions: [{ index: 12, rect: { x: 120, y: 64, width: 88, height: 240 } }],
  },
  text: 'ありがとう',
  note: null,
  confidence: 0.94,
  createdAt: 1_759_480_000_000,
  editedAt: null,
  tagIds: ['t-sfx'],
} as const satisfies StoredCapture;

const DAMAGE_OPTIONS: readonly DamageOption[] = [
  { damage: 'none', label: 'As stored' },
  { damage: 'origin-missing', label: 'origin missing' },
  { damage: 'written-confidence', label: "origin: 'written', confidence kept" },
  { damage: 'note-missing', label: 'note missing' },
  { damage: 'region-x-text', label: "region x: '120'" },
  { damage: 'tag-number', label: 'tagIds: [7]' },
  { damage: 'anchor-kind', label: "anchor.kind: 'page'" },
  { damage: 'anchor-text', label: "anchor: 'region'" },
  { damage: 'text-missing', label: 'text missing' },
  { damage: 'id-missing', label: 'id missing' },
];

function isRowDamage(value: string): value is RowDamage {
  return DAMAGE_OPTIONS.some((option) => option.damage === value);
}

function without(row: Readonly<Record<string, unknown>>, field: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).filter(([key]) => key !== field));
}

function damagedCapture(damage: RowDamage): Readonly<Record<string, unknown>> {
  const row = STORED_CAPTURE;
  const region = row.anchor.regions[0];
  return match(damage)
    .with('none', () => row)
    .with('origin-missing', () => without(row, 'origin'))
    .with('written-confidence', () => ({ ...row, origin: 'written' }))
    .with('note-missing', () => without(row, 'note'))
    .with('region-x-text', () => ({
      ...row,
      anchor: { ...row.anchor, regions: [{ ...region, rect: { ...region.rect, x: '120' } }] },
    }))
    .with('tag-number', () => ({ ...row, tagIds: [7] }))
    .with('anchor-kind', () => ({ ...row, anchor: { ...row.anchor, kind: 'page' } }))
    .with('anchor-text', () => ({ ...row, anchor: 'region' }))
    .with('text-missing', () => without(row, 'text'))
    .with('id-missing', () => without(row, 'id'))
    .exhaustive();
}

function rowText(damage: RowDamage): string {
  return JSON.stringify(damagedCapture(damage), null, 2);
}

function parsedRow(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (cause) {
    if (cause instanceof SyntaxError) return cause;
    throw cause;
  }
}

function defaultsApplied(row: StoredCapture, capture: Capture): readonly string[] {
  const origin =
    row.origin === capture.origin
      ? []
      : [
          `origin: ${row.origin === undefined ? 'missing' : JSON.stringify(row.origin)} → '${capture.origin}'`,
        ];
  const note = row.note === undefined && 'note' in capture ? ['note: missing → null'] : [];
  const confidence =
    row.confidence !== undefined && !('confidence' in capture)
      ? [`confidence: ${String(row.confidence)} dropped, a written capture has none`]
      : [];
  return [...origin, ...note, ...confidence];
}

function readCheck(row: StoredCapture): CaptureRowCheck {
  let listed: ReturnType<typeof capturesFromStored>;
  try {
    listed = capturesFromStored([row]);
  } catch (cause) {
    return { kind: 'listing-fails', reason: describeCause(cause) };
  }
  const [capture] = listed.captures;
  if (capture !== undefined) {
    return { kind: 'read', capture, defaults: defaultsApplied(row, capture) };
  }
  const [unreadable] = listed.unreadable;
  if (unreadable === undefined) throw new Error('The stored row was neither read nor set aside');
  return { kind: 'set-aside', id: unreadable.id, reason: setAsideReason(row) };
}

function setAsideReason(row: StoredCapture): string {
  try {
    captureFromStored(row);
    return '';
  } catch (cause) {
    return describeCause(cause);
  }
}

function checkedCaptureRow(text: string): CaptureRowCheck {
  const parsed = parsedRow(text);
  if (parsed instanceof SyntaxError) return { kind: 'not-a-row', reason: parsed.message };
  if (!isStoredFields(parsed)) {
    return { kind: 'not-a-row', reason: `A row must be an object, and this is ${String(parsed)}` };
  }
  return readCheck(parsed);
}

export { DAMAGE_OPTIONS, STORED_CAPTURE, checkedCaptureRow, damagedCapture, isRowDamage, rowText };
export type { CaptureRowCheck, DamageOption, RowDamage };
