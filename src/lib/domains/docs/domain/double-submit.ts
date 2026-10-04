import { match } from 'ts-pattern';

type SubmitHandling = 'naive' | 'disable' | 'ignore';

type PressOutcome =
  | { readonly kind: 'started'; readonly save: number }
  | { readonly kind: 'ignored' };

type DeskWatcher = {
  readonly changed: () => void;
  readonly pressed: (outcome: PressOutcome) => void;
  readonly saved: (save: number) => void;
};

type Saving = () => Promise<void>;

function ignoresWhileBusy(handling: SubmitHandling): boolean {
  return match(handling)
    .with('naive', 'disable', () => false)
    .with('ignore', () => true)
    .exhaustive();
}

function disablesWhileBusy(handling: SubmitHandling): boolean {
  return match(handling)
    .with('naive', 'ignore', () => false)
    .with('disable', () => true)
    .exhaustive();
}

class SaveDesk {
  #handling: SubmitHandling;
  #save: Saving;
  #watcher: DeskWatcher;
  #running = 0;
  #started = 0;
  #written = 0;

  constructor(handling: SubmitHandling, save: Saving, watcher: DeskWatcher) {
    this.#handling = handling;
    this.#save = save;
    this.#watcher = watcher;
  }

  get busy(): boolean {
    return this.#running > 0;
  }

  get written(): number {
    return this.#written;
  }

  get disabled(): boolean {
    return disablesWhileBusy(this.#handling) && this.busy;
  }

  async press(): Promise<void> {
    if (ignoresWhileBusy(this.#handling) && this.busy) {
      this.#watcher.pressed({ kind: 'ignored' });
      return;
    }
    this.#started += 1;
    const save = this.#started;
    this.#running += 1;
    this.#watcher.pressed({ kind: 'started', save });
    this.#watcher.changed();
    try {
      await this.#save();
      this.#written += 1;
      this.#watcher.saved(save);
    } finally {
      this.#running -= 1;
      this.#watcher.changed();
    }
  }
}

export { SaveDesk, disablesWhileBusy, ignoresWhileBusy };
export type { DeskWatcher, PressOutcome, Saving, SubmitHandling };
