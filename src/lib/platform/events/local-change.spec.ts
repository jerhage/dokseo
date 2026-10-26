import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LOCAL_CHANGE_CHANNEL, announceLocalChange, watchLocalChanges } from './local-change';

class FakeChannel {
  static readonly all: FakeChannel[] = [];
  onmessage: (() => void) | null = null;
  closed = false;
  readonly name: string;

  constructor(name: string) {
    this.name = name;
    FakeChannel.all.push(this);
  }

  postMessage(): void {
    for (const other of FakeChannel.all) {
      if (other !== this && other.name === this.name && !other.closed) other.onmessage?.();
    }
  }

  close(): void {
    this.closed = true;
  }
}

beforeEach(() => {
  FakeChannel.all.length = 0;
  vi.stubGlobal('BroadcastChannel', FakeChannel);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('local change notices', () => {
  it('reaches a watcher on the named channel and stops reaching it once it is stopped', () => {
    const noticed = vi.fn();
    const stop = watchLocalChanges(noticed);

    announceLocalChange();
    stop();
    announceLocalChange();

    expect(FakeChannel.all.every((channel) => channel.name === LOCAL_CHANGE_CHANNEL)).toBe(true);
    expect(noticed).toHaveBeenCalledOnce();
  });

  it('does nothing where the browser has no broadcast channel', () => {
    vi.stubGlobal('BroadcastChannel', undefined);
    const noticed = vi.fn();

    watchLocalChanges(noticed)();
    announceLocalChange();

    expect(noticed).not.toHaveBeenCalled();
  });
});
