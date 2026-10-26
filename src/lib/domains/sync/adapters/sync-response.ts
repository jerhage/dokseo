import { isChange } from '../domain/change';
import type { StoredChange } from '../domain/change';
import type {
  AcceptedChange,
  CreatedDevice,
  DeviceSummary,
  PullPage,
  RejectionCode,
  ServerInfo,
} from '../domain/sync-server';

type Fields = { readonly [field: string]: unknown };

type ErrorBody = { readonly code: RejectionCode; readonly index: number | null };

const REJECTION_CODES: readonly RejectionCode[] = [
  'invalid-request',
  'invalid-change',
  'device-mismatch',
  'forbidden',
  'too-large',
];

function isFields(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isRejectionCode(value: unknown): value is RejectionCode {
  return REJECTION_CODES.some((code) => code === value);
}

function everyItem<T>(value: unknown, parse: (item: unknown) => T | null): readonly T[] | null {
  if (!Array.isArray(value)) return null;
  const items: T[] = [];
  for (const entry of value) {
    const item = parse(entry);
    if (item === null) return null;
    items.push(item);
  }
  return items;
}

function apiVersionsOf(value: unknown): readonly number[] | null {
  const versions = everyItem(value, (item) =>
    typeof item === 'number' && Number.isInteger(item) && item >= 1 ? item : null,
  );
  return versions !== null && versions.length > 0 ? versions : null;
}

function parseInfo(body: unknown): ServerInfo | null {
  if (!isFields(body) || body['server'] !== 'dokseo-sync' || !isText(body['version'])) return null;
  const apiVersions = apiVersionsOf(body['apiVersions']);
  if (apiVersions === null) return null;
  return { server: 'dokseo-sync', version: body['version'], apiVersions };
}

function parseCreatedDevice(body: unknown): CreatedDevice | null {
  if (!isFields(body) || !isText(body['deviceId']) || !isText(body['token'])) return null;
  return { deviceId: body['deviceId'], token: body['token'] };
}

function deviceSummary(entry: unknown): DeviceSummary | null {
  if (!isFields(entry)) return null;
  const { deviceId, deviceName, createdAt, lastSeenAt } = entry;
  if (!isText(deviceId) || !isText(deviceName) || !isCount(createdAt)) return null;
  if (lastSeenAt !== null && !isCount(lastSeenAt)) return null;
  return { deviceId, deviceName, createdAt, lastSeenAt };
}

function parseDeviceList(body: unknown): readonly DeviceSummary[] | null {
  if (!isFields(body)) return null;
  return everyItem(body['devices'], deviceSummary);
}

function acceptedChange(entry: unknown): AcceptedChange | null {
  if (!isFields(entry)) return null;
  const { id, seq } = entry;
  if (!isText(id) || !isCount(seq) || seq < 1) return null;
  return { id, seq };
}

function parseAccepted(body: unknown): readonly AcceptedChange[] | null {
  if (!isFields(body)) return null;
  return everyItem(body['accepted'], acceptedChange);
}

function storedChange(entry: unknown): StoredChange | null {
  if (!isChange(entry)) return null;
  if (!('seq' in entry) || !isCount(entry.seq) || entry.seq < 1) return null;
  if (!('receivedAt' in entry) || !isCount(entry.receivedAt)) return null;
  return {
    id: entry.id,
    kind: entry.kind,
    recordId: entry.recordId,
    data: entry.data,
    updatedAt: entry.updatedAt,
    deviceId: entry.deviceId,
    seq: entry.seq,
    receivedAt: entry.receivedAt,
  };
}

function parsePullPage(body: unknown): PullPage | null {
  if (!isFields(body)) return null;
  const { next, more } = body;
  if (!isCount(next) || typeof more !== 'boolean') return null;
  const changes = everyItem(body['changes'], storedChange);
  if (changes === null) return null;
  return { changes, next, more };
}

function parseErrorBody(body: unknown): ErrorBody | null {
  if (!isFields(body)) return null;
  const error = body['error'];
  if (!isFields(error) || !isRejectionCode(error['code'])) return null;
  const index = error['index'];
  return { code: error['code'], index: isCount(index) ? index : null };
}

export {
  parseAccepted,
  parseCreatedDevice,
  parseDeviceList,
  parseErrorBody,
  parseInfo,
  parsePullPage,
};
export type { ErrorBody };
