import { Toaster } from '../components/toaster.svelte';

type Emitted = { readonly callback: string; readonly values: readonly unknown[] };

type RuleOptions = Readonly<Record<string, unknown>>;

type MarqueeHandle = {
  readonly pointerdown: (event: PointerEvent) => void;
  readonly pointermove: (event: PointerEvent) => void;
  readonly pointerup: (event: PointerEvent) => void;
  readonly pointercancel: (event: PointerEvent) => void;
};

class RuleControls {
  open = $state(false);
  marquee = $state<MarqueeHandle>();
  readonly wrapFocus: boolean;
  readonly blockEnd: number | undefined;
  readonly surface: HTMLElement | null;
  readonly toaster = new Toaster();
  readonly emitted: Emitted[] = [];

  constructor(options: RuleOptions = {}, surface: HTMLElement | null = null) {
    const blockEnd = options['blockEnd'];
    this.wrapFocus = options['wrapFocus'] === true;
    this.blockEnd = typeof blockEnd === 'number' ? blockEnd : undefined;
    this.surface = surface;
  }

  record(callback: string): (...values: unknown[]) => void {
    return (...values) => {
      this.emitted.push({ callback, values });
    };
  }

  set(prop: string, value: unknown): void {
    if (prop !== 'open') throw new Error(`No rule subject takes the prop ${prop}`);
    this.open = value === true;
  }

  call(method: string, value: unknown): void {
    if (method !== 'reserveBlockEnd') throw new Error(`No rule subject offers ${method}()`);
    this.toaster.reserveBlockEnd(Number(value));
  }
}

export { RuleControls };
export type { Emitted, MarqueeHandle, RuleOptions };
