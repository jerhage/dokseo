type RelayPress = {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly defaultPrevented: boolean;
  readonly relayed: boolean;
};

const CLOSES_WITHOUT_A_MODIFIER = 'Escape';

const sent = new WeakSet<object>();

function markRelayed(event: object): void {
  sent.add(event);
}

function wasRelayed(event: object): boolean {
  return sent.has(event);
}

function relaysToHost(press: RelayPress): boolean {
  if (press.relayed) return false;
  if (press.defaultPrevented) return false;
  if (press.key === CLOSES_WITHOUT_A_MODIFIER) return true;

  return press.metaKey || press.ctrlKey;
}

function pressOf(event: KeyboardEvent): RelayPress {
  return {
    key: event.key,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    defaultPrevented: event.defaultPrevented,
    relayed: wasRelayed(event),
  };
}

function copyOf(event: KeyboardEvent, host: Window): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key: event.key,
    code: event.code,
    location: event.location,
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    shiftKey: event.shiftKey,
    repeat: event.repeat,
    isComposing: event.isComposing,
    bubbles: true,
    cancelable: true,
    composed: true,
    view: host,
  });
}

function relayKeydownsTo(host: Window, from: Document): void {
  from.addEventListener('keydown', (event) => {
    if (!relaysToHost(pressOf(event))) return;

    const copy = copyOf(event, host);
    markRelayed(copy);
    if (!host.dispatchEvent(copy)) event.preventDefault();
  });
}

export { CLOSES_WITHOUT_A_MODIFIER, markRelayed, relayKeydownsTo, relaysToHost, wasRelayed };
export type { RelayPress };
