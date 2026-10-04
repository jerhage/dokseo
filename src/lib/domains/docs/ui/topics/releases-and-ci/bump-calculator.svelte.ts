import { conventionalCommits } from '../../../domain/conventional-commit';
import {
  DOKSEO_BUMP_OPTIONS,
  DOKSEO_CHANGELOG_SECTIONS,
  RELEASE_PLEASE_DEFAULTS,
} from '../../../domain/dokseo-release';
import { nextRelease, parseVersion } from '../../../domain/release-bump';
import type { BumpOptions, NextRelease } from '../../../domain/release-bump';

type BumpSettings = 'dokseo' | 'defaults';

type CalculatorResult =
  | { readonly kind: 'bad-version'; readonly text: string }
  | { readonly kind: 'computed'; readonly release: NextRelease };

type CommitPreset = {
  readonly key: string;
  readonly label: string;
  readonly from: string;
  readonly newestFirst: readonly string[];
};

type TypedCommit = { readonly id: number; readonly message: string };

const COMMIT_PRESETS: readonly CommitPreset[] = [
  {
    key: 'release-0-9-3',
    from: '0.9.2',
    label: 'The real 0.9.3',
    newestFirst: [
      "ci: deploy runs the project's own wrangler instead of the Node 20 wrangler-action",
      'fix(reader): the edge-click toggle shows only where a pointer can hover, so a touch-only iPad that expects an Apple Pencil offers the touch settings alone',
    ],
  },
  {
    key: 'release-0-9-4',
    from: '0.9.3',
    label: 'Three real 0.9.4 features',
    newestFirst: [
      'feat(export): offer Export these captures in the three dialogs that delete captures for good',
      'feat(export): import a captures file from Your data, with a preview, a conflict choice and the result',
      'feat(recognition): restore a tag as it was, keeping its id, colour and creation time',
    ],
  },
  {
    key: 'hidden-only',
    from: '0.9.4',
    label: 'Hidden types only',
    newestFirst: [
      'refactor(storage): one reader for every record kind',
      'test: cover a file with no version',
      'docs: say how to restore a removed book',
    ],
  },
  {
    key: 'breaking',
    from: '0.9.4',
    label: 'A breaking change',
    newestFirst: [
      'fix(reader): a tap on the last page turns once',
      'feat(storage)!: keep captures in a new record format\n\nBREAKING CHANGE: export captures before updating, then import them',
    ],
  },
  {
    key: 'release-as',
    from: '0.9.4',
    label: 'Reaching 1.0',
    newestFirst: [
      'chore: release 1.0.0\n\nRelease-As: 1.0.0',
      'feat(settings): name the supported browsers',
    ],
  },
];

const SETTINGS: Readonly<Record<BumpSettings, BumpOptions>> = {
  dokseo: DOKSEO_BUMP_OPTIONS,
  defaults: RELEASE_PLEASE_DEFAULTS,
};

function calculate(
  versionText: string,
  messages: readonly string[],
  options: BumpOptions,
): CalculatorResult {
  const version = parseVersion(versionText);
  if (version === null) return { kind: 'bad-version', text: versionText };

  const commits = messages.flatMap(conventionalCommits);
  return {
    kind: 'computed',
    release: nextRelease(version, commits, options, DOKSEO_CHANGELOG_SECTIONS),
  };
}

class BumpCalculator {
  #nextId = 0;
  commits = $state.raw<readonly TypedCommit[]>([]);
  draft = $state('');
  beforeOne = $state('0.9.4');
  afterOne = $state('1.2.0');
  settings = $state<BumpSettings>('dokseo');

  constructor(presetKey: string = COMMIT_PRESETS[0]?.key ?? '') {
    this.load(presetKey);
  }

  get messages(): readonly string[] {
    return this.commits.map((commit) => commit.message);
  }

  get before(): CalculatorResult {
    return calculate(this.beforeOne, this.messages, SETTINGS[this.settings]);
  }

  get after(): CalculatorResult {
    return calculate(this.afterOne, this.messages, SETTINGS[this.settings]);
  }

  load(presetKey: string): void {
    const preset = COMMIT_PRESETS.find((candidate) => candidate.key === presetKey);
    if (preset === undefined) return;

    this.commits = preset.newestFirst.map((message) => this.#typed(message));
    this.beforeOne = preset.from;
  }

  add(): void {
    const message = this.draft.trim();
    if (message === '') return;

    this.commits = [this.#typed(message), ...this.commits];
    this.draft = '';
  }

  remove(id: number): void {
    this.commits = this.commits.filter((commit) => commit.id !== id);
  }

  clear(): void {
    this.commits = [];
  }

  #typed(message: string): TypedCommit {
    this.#nextId += 1;
    return { id: this.#nextId, message };
  }
}

export { BumpCalculator, COMMIT_PRESETS, calculate };
export type { BumpSettings, CalculatorResult, CommitPreset, TypedCommit };
