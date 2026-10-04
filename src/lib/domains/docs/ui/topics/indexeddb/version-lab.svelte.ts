import { describeCause } from '$lib/shared/cause';
import type { VersionConnection, VersionDriver } from './version-driver';

type Speaker = 'A' | 'B' | 'page';

type VersionLogEntry = { readonly id: number; readonly speaker: Speaker; readonly text: string };

type ConnectionA =
  | { readonly kind: 'none' }
  | { readonly kind: 'open'; readonly connection: VersionConnection }
  | { readonly kind: 'closed'; readonly version: number };

function failureName(cause: unknown): string {
  return cause instanceof DOMException ? `${cause.name}: ${cause.message}` : describeCause(cause);
}

function versionText(version: number | null): string {
  return version === null ? 'null (a delete)' : String(version);
}

class VersionLab {
  #a = $state.raw<ConnectionA>({ kind: 'none' });
  #closesOnChange = $state(true);
  #stored = $state<number | null>(null);
  #waiting = $state(false);
  #log = $state.raw<readonly VersionLogEntry[]>([]);
  #next = 0;
  readonly #driver: VersionDriver;

  constructor(driver: VersionDriver) {
    this.#driver = driver;
  }

  get a(): ConnectionA {
    return this.#a;
  }

  get closesOnChange(): boolean {
    return this.#closesOnChange;
  }

  set closesOnChange(closes: boolean) {
    this.#closesOnChange = closes;
  }

  get stored(): number | null {
    return this.#stored;
  }

  get waiting(): boolean {
    return this.#waiting;
  }

  get log(): readonly VersionLogEntry[] {
    return this.#log;
  }

  get nextVersion(): number {
    const known = this.#a.kind === 'open' ? this.#a.connection.version : 0;
    return Math.max(this.#stored ?? 0, known) + 1;
  }

  async refresh(): Promise<void> {
    this.#stored = await this.#driver.current();
  }

  async openA(): Promise<void> {
    if (this.#a.kind === 'open') return;
    const asked = this.#a.kind === 'closed' ? this.#a.version : undefined;
    try {
      const connection = await this.#driver.openA(asked, {
        versionChange: (oldVersion, newVersion) => this.#versionChange(oldVersion, newVersion),
      });
      this.#a = { kind: 'open', connection };
      this.#say('A', `opened at version ${connection.version}`);
    } catch (cause) {
      this.#say('A', `open(${asked ?? 'no version'}) failed with ${failureName(cause)}`);
    }
    await this.refresh();
  }

  closeA(): void {
    if (this.#a.kind !== 'open') return;
    this.#a.connection.close();
    this.#a = { kind: 'closed', version: this.#a.connection.version };
    this.#say('A', 'close() called');
  }

  async openB(): Promise<void> {
    if (this.#waiting) return;
    this.#waiting = true;
    const version = this.nextVersion;
    this.#say('B', `open(${version}) requested`);
    try {
      const reached = await this.#driver.openB(version, {
        blocked: (oldVersion, newVersion) =>
          this.#say(
            'B',
            `blocked: another connection still holds version ${oldVersion}; waiting to reach ${versionText(newVersion)}`,
          ),
        upgrade: (oldVersion, newVersion, created) =>
          this.#say(
            'B',
            `upgradeneeded ${oldVersion} → ${newVersion}; created ${created.length === 0 ? 'nothing' : created.join(', ')}`,
          ),
      });
      this.#say('B', `success at version ${reached}, then closed`);
    } catch (cause) {
      this.#say('B', `failed with ${failureName(cause)}`);
    } finally {
      this.#waiting = false;
    }
    await this.refresh();
  }

  async remove(): Promise<void> {
    this.#say('page', 'deleteDatabase requested');
    try {
      await this.#driver.remove(() =>
        this.#say('page', 'deleteDatabase is blocked by an open connection'),
      );
      this.#a = { kind: 'none' };
      this.#say('page', 'deleteDatabase succeeded');
    } catch (cause) {
      this.#say('page', `deleteDatabase failed with ${failureName(cause)}`);
    }
    await this.refresh();
  }

  #versionChange(oldVersion: number, newVersion: number | null): boolean {
    const closes = this.#closesOnChange;
    this.#say(
      'A',
      `versionchange ${oldVersion} → ${versionText(newVersion)}; ${closes ? 'closing' : 'staying open'}`,
    );
    if (closes && this.#a.kind === 'open') {
      this.#a = { kind: 'closed', version: this.#a.connection.version };
    }
    return closes;
  }

  #say(speaker: Speaker, text: string): void {
    this.#next += 1;
    this.#log = [...this.#log, { id: this.#next, speaker, text }];
  }
}

export { VersionLab };
export type { ConnectionA, Speaker, VersionLogEntry };
