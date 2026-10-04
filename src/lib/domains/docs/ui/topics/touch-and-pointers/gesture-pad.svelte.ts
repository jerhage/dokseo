import { SYSTEM_CLOCK } from '$lib/components/clock';
import type { Clock } from '$lib/components/clock';
import type {
  GestureContext,
  GestureInput,
  GestureIntent,
  GestureSample,
  GestureState,
} from '$lib/components/gesture';
import { GestureFeed } from '$lib/components/gesture-feed';
import type { GesturePointer } from '$lib/components/gesture-feed';
import { gestureReading } from '../../../domain/gesture-reading';
import type { GestureMark, GestureReading, SwipeArea } from '../../../domain/gesture-reading';

type TraceLine = { readonly text: string; readonly key: string | null; readonly repeats: number };

type GestureMarks = { readonly press: GestureMark | null; readonly lift: GestureMark | null };

type GesturePadHost = {
  readonly context: () => GestureContext;
  readonly area: () => SwipeArea;
};

const TRACE_LINES = 12;

const READINGS_KEPT = 6;

function rounded(value: number): number {
  return Math.round(value);
}

function intentText(intent: GestureIntent): string {
  const { kind, ...fields } = intent;
  const values = Object.entries(fields).map(([name, value]) =>
    typeof value === 'number'
      ? `${name} ${Math.round(value * 100) / 100}`
      : `${name} ${rounded(value.x)},${rounded(value.y)}`,
  );
  return ['→', kind, ...values].join(' ');
}

class GesturePad {
  #host: GesturePadHost;
  #feed: GestureFeed;
  #current: GestureMarks = { press: null, lift: null };
  #previous: GestureMarks = { press: null, lift: null };
  #origin: number | null = null;
  #state = $state.raw<GestureState['kind']>('idle');
  #trace = $state.raw<readonly TraceLine[]>([]);
  #readings = $state.raw<readonly GestureReading[]>([]);

  constructor(host: GesturePadHost, clock: Clock = SYSTEM_CLOCK) {
    this.#host = host;
    this.#feed = new GestureFeed((tick) => this.#step(tick, null), clock);
  }

  get state(): GestureState['kind'] {
    return this.#state;
  }

  get trace(): readonly TraceLine[] {
    return this.#trace;
  }

  get readings(): readonly GestureReading[] {
    return this.#readings;
  }

  pointer(kind: GestureSample['kind'], pointer: GesturePointer): void {
    const sample = this.#feed.sample(kind, pointer);
    const mark: GestureMark = { at: { x: sample.x, y: sample.y }, t: sample.t };
    if (sample.kind === 'down' && this.#feed.state.kind === 'idle') {
      this.#previous = this.#current;
      this.#current = { press: mark, lift: null };
      this.#origin = sample.t;
    }
    if (sample.kind === 'up' && this.#current.lift === null) {
      this.#current = { ...this.#current, lift: mark };
    }
    const origin = this.#origin ?? sample.t;
    this.#note(
      `${sample.kind} #${sample.id} ${sample.type} ${rounded(sample.x)},${rounded(sample.y)} +${rounded(sample.t - origin)} ms`,
      sample.kind === 'move' ? `move #${sample.id}` : null,
    );
    this.#step(sample, { x: sample.x, y: sample.y });
  }

  clear(): void {
    this.#trace = [];
    this.#readings = [];
  }

  stop(): void {
    this.#feed.stop();
  }

  #step(input: GestureInput, at: { x: number; y: number } | null): void {
    if (input.kind === 'tick' && this.#origin !== null) {
      this.#note(`tick +${rounded(input.t - this.#origin)} ms`, null);
    }

    const before = this.#feed.state.kind;
    const step = this.#feed.step(input, this.#host.context());
    this.#state = step.state.kind;
    if (step.intent.kind === 'none') return;

    this.#note(intentText(step.intent), null);
    const marks = this.#marksFor(step.intent, input, before);
    const now: GestureMark = { at: at ?? marks.press?.at ?? { x: 0, y: 0 }, t: input.t };
    const end = step.intent.kind === 'tap' ? (marks.lift ?? now) : now;
    const reading = gestureReading(step.intent, marks.press, end, this.#host.area());
    if (reading !== null) this.#readings = [reading, ...this.#readings].slice(0, READINGS_KEPT);
  }

  #marksFor(
    intent: GestureIntent,
    input: GestureInput,
    before: GestureState['kind'],
  ): GestureMarks {
    if (intent.kind !== 'tap') return this.#current;
    const settled = input.kind === 'up' || (input.kind === 'tick' && before === 'idle');
    return settled ? this.#current : this.#previous;
  }

  #note(text: string, key: string | null): void {
    const [latest, ...rest] = this.#trace;
    if (key !== null && latest !== undefined && latest.key === key) {
      this.#trace = [{ text, key, repeats: latest.repeats + 1 }, ...rest];
      return;
    }
    this.#trace = [{ text, key, repeats: 1 }, ...this.#trace].slice(0, TRACE_LINES);
  }
}

export { GesturePad };
export type { GesturePadHost, TraceLine };
