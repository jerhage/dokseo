import type { Change, StoredChange } from './change';

type ServerInfo = {
  readonly server: 'dokseo-sync';
  readonly version: string;
  readonly apiVersions: readonly number[];
};

type DeviceRequest = {
  readonly username: string;
  readonly password: string;
  readonly deviceName: string;
};

type CreatedDevice = {
  readonly deviceId: string;
  readonly token: string;
};

type DeviceSummary = {
  readonly deviceId: string;
  readonly deviceName: string;
  readonly createdAt: number;
  readonly lastSeenAt: number | null;
};

type AcceptedChange = {
  readonly id: string;
  readonly seq: number;
};

type PullPage = {
  readonly changes: readonly StoredChange[];
  readonly next: number;
  readonly more: boolean;
};

type RejectionCode =
  | 'invalid-request'
  | 'invalid-change'
  | 'device-mismatch'
  | 'forbidden'
  | 'too-large';

type Offline = { readonly kind: 'offline' };
type Unauthorized = { readonly kind: 'unauthorized' };
type RateLimited = { readonly kind: 'rate-limited' };
type NotFound = { readonly kind: 'not-found' };
type ServerError = { readonly kind: 'server-error'; readonly status: number };
type UnreadableResponse = { readonly kind: 'unreadable-response' };
type Rejected = {
  readonly kind: 'rejected';
  readonly code: RejectionCode;
  readonly index: number | null;
};

type ServerFailure =
  | Offline
  | Unauthorized
  | RateLimited
  | NotFound
  | Rejected
  | ServerError
  | UnreadableResponse;

type InfoResult =
  | { readonly kind: 'success'; readonly info: ServerInfo }
  | Offline
  | RateLimited
  | ServerError
  | UnreadableResponse;

type CreateDeviceResult =
  | { readonly kind: 'success'; readonly device: CreatedDevice }
  | Offline
  | Unauthorized
  | RateLimited
  | Rejected
  | ServerError
  | UnreadableResponse;

type ListDevicesResult =
  | { readonly kind: 'success'; readonly devices: readonly DeviceSummary[] }
  | Offline
  | Unauthorized
  | RateLimited
  | ServerError
  | UnreadableResponse;

type RevokeDeviceResult =
  | { readonly kind: 'success' }
  | Offline
  | Unauthorized
  | RateLimited
  | NotFound
  | ServerError
  | UnreadableResponse;

type PushResult =
  | { readonly kind: 'success'; readonly accepted: readonly AcceptedChange[] }
  | Offline
  | Unauthorized
  | RateLimited
  | Rejected
  | ServerError
  | UnreadableResponse;

type PullResult =
  | { readonly kind: 'success'; readonly page: PullPage }
  | Offline
  | Unauthorized
  | RateLimited
  | Rejected
  | ServerError
  | UnreadableResponse;

interface SyncServer {
  info(url: string): Promise<InfoResult>;
  createDevice(url: string, request: DeviceRequest): Promise<CreateDeviceResult>;
  listDevices(url: string, token: string): Promise<ListDevicesResult>;
  revokeDevice(url: string, token: string, deviceId: string): Promise<RevokeDeviceResult>;
  push(url: string, token: string, changes: readonly Change[]): Promise<PushResult>;
  pull(url: string, token: string, after: number, limit: number): Promise<PullResult>;
}

export type {
  AcceptedChange,
  CreateDeviceResult,
  CreatedDevice,
  DeviceRequest,
  DeviceSummary,
  InfoResult,
  ListDevicesResult,
  PullPage,
  PullResult,
  PushResult,
  RejectionCode,
  RevokeDeviceResult,
  ServerFailure,
  ServerInfo,
  SyncServer,
};
