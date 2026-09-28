type ChromeBar = {
  readonly inert: boolean;
  readonly contains: (node: Element) => boolean;
};

function chromeShown(asked: boolean, held: boolean): boolean {
  return asked || held;
}

function chromeHolds(
  bars: readonly (ChromeBar | undefined)[],
  nodes: readonly (Element | null)[],
): boolean {
  return bars.some(
    (bar) => bar?.inert === false && nodes.some((node) => node !== null && bar.contains(node)),
  );
}

export { chromeHolds, chromeShown };
export type { ChromeBar };
