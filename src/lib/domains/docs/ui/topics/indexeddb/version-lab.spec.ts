import { describe, expect, it } from 'vitest';
import type { OpenAEvents, VersionDriver } from './version-driver';
import { VersionLab } from './version-lab.svelte';

function fakeDriver(): VersionDriver {
  let stored = 0;
  let holder: { events: OpenAEvents; open: boolean } | null = null;
  let released: (() => void) | null = null;

  const release = () => {
    if (holder !== null) holder.open = false;
    released?.();
    released = null;
  };

  const yieldOrWait = (newVersion: number | null, blocked: () => void): Promise<void> => {
    if (holder === null || !holder.open) return Promise.resolve();
    if (holder.events.versionChange(stored, newVersion)) {
      release();
      return Promise.resolve();
    }
    blocked();
    return new Promise((resolve) => {
      released = resolve;
    });
  };

  return {
    current: () => Promise.resolve(stored),
    openA: (version, events) => {
      const asked = version ?? Math.max(stored, 1);
      if (asked < stored) {
        return Promise.reject(new DOMException('The requested version is less', 'VersionError'));
      }
      stored = asked;
      holder = { events, open: true };
      return Promise.resolve({ version: asked, close: release });
    },
    openB: async (version, events) => {
      await yieldOrWait(version, () => events.blocked(stored, version));
      events.upgrade(stored, version, [`store-v${version}`]);
      stored = version;
      return version;
    },
    remove: async (blocked) => {
      await yieldOrWait(null, blocked);
      stored = 0;
    },
  };
}

function texts(lab: VersionLab): readonly string[] {
  return lab.log.map((entry) => `${entry.speaker}: ${entry.text}`);
}

describe('VersionLab', () => {
  it('lets B upgrade at once when A closes on versionchange', async () => {
    const lab = new VersionLab(fakeDriver());

    await lab.openA();
    await lab.openB();

    expect(texts(lab)).toEqual([
      'A: opened at version 1',
      'B: open(2) requested',
      'A: versionchange 1 → 2; closing',
      'B: upgradeneeded 1 → 2; created store-v2',
      'B: success at version 2, then closed',
    ]);
    expect(lab.a).toEqual({ kind: 'closed', version: 1 });
  });

  it('leaves B blocked while A stays open, and lets it finish once A closes', async () => {
    const lab = new VersionLab(fakeDriver());
    lab.closesOnChange = false;

    await lab.openA();
    const upgrade = lab.openB();
    await Promise.resolve();

    expect(lab.waiting).toBe(true);
    expect(texts(lab)).toContain(
      'B: blocked: another connection still holds version 1; waiting to reach 2',
    );

    lab.closeA();
    await upgrade;

    expect(lab.waiting).toBe(false);
    expect(texts(lab).at(-1)).toBe('B: success at version 2, then closed');
  });

  it('reports a VersionError when A reopens at the version it had before the upgrade', async () => {
    const lab = new VersionLab(fakeDriver());

    await lab.openA();
    await lab.openB();
    await lab.openA();

    expect(texts(lab).at(-1)).toBe(
      'A: open(1) failed with VersionError: The requested version is less',
    );
  });

  it('asks for one version above the stored one', async () => {
    const lab = new VersionLab(fakeDriver());

    await lab.openA();
    await lab.openB();
    await lab.openB();

    expect(lab.stored).toBe(3);
    expect(lab.nextVersion).toBe(4);
  });

  it('names a delete as a version change to null', async () => {
    const lab = new VersionLab(fakeDriver());

    await lab.openA();
    await lab.remove();

    expect(texts(lab)).toContain('A: versionchange 1 → null (a delete); closing');
    expect(lab.a).toEqual({ kind: 'none' });
    expect(lab.stored).toBe(0);
  });
});
