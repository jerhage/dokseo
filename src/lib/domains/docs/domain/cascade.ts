type Specificity = readonly [number, number, number];

type CascadeEntry = {
  readonly layer: string | null;
  readonly selector: string;
  readonly specificity: Specificity;
  readonly value: string;
  readonly order: number;
};

type TokenStep = {
  readonly name: string;
  readonly entry: CascadeEntry;
};

type TokenChain = {
  readonly steps: readonly TokenStep[];
  readonly end: 'value' | 'missing' | 'too-deep';
};

const ZERO: Specificity = [0, 0, 0];

const FORGIVING_ZERO = new Set(['where']);

const TAKES_LARGEST_ARGUMENT = new Set(['is', 'not', 'has', 'matches']);

const LEGACY_PSEUDO_ELEMENTS = new Set(['before', 'after', 'first-line', 'first-letter']);

const CHAIN_LIMIT = 12;

function splitSelectorList(text: string): readonly string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quote !== null) {
      if (char === '\\') index += 1;
      else if (char === quote) quote = null;
    } else if (char === '"' || char === "'") quote = char;
    else if (char === '(' || char === '[') depth += 1;
    else if (char === ')' || char === ']') depth -= 1;
    else if (char === ',' && depth === 0) {
      parts.push(text.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(text.slice(start).trim());
  return parts.filter((part) => part !== '');
}

function readIdent(text: string, from: number): number {
  let index = from;
  while (index < text.length) {
    const char = text[index] ?? '';
    if (char === '\\') index += 2;
    else if (/[\w-]/u.test(char) || char.charCodeAt(0) > 127) index += 1;
    else break;
  }
  return index;
}

function closing(text: string, open: number, close: string): number {
  const opener = text[open];
  let depth = 0;
  for (let index = open; index < text.length; index += 1) {
    if (text[index] === opener) depth += 1;
    if (text[index] === close) depth -= 1;
    if (depth === 0) return index;
  }
  return text.length - 1;
}

function addSpecificity(left: Specificity, right: Specificity): Specificity {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function compareSpecificity(left: Specificity, right: Specificity): number {
  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2];
}

function largest(list: readonly Specificity[]): Specificity {
  return list.reduce((best, next) => (compareSpecificity(next, best) > 0 ? next : best), ZERO);
}

function pseudoClass(name: string, argument: string | null): Specificity {
  if (FORGIVING_ZERO.has(name)) return ZERO;
  if (LEGACY_PSEUDO_ELEMENTS.has(name)) return [0, 0, 1];
  if (TAKES_LARGEST_ARGUMENT.has(name) && argument !== null)
    return largest(splitSelectorList(argument).map(specificity));
  return [0, 1, 0];
}

function specificity(selector: string): Specificity {
  let total = ZERO;
  let index = 0;
  while (index < selector.length) {
    const char = selector[index] ?? '';
    if (char === '#') {
      total = addSpecificity(total, [1, 0, 0]);
      index = readIdent(selector, index + 1);
    } else if (char === '.') {
      total = addSpecificity(total, [0, 1, 0]);
      index = readIdent(selector, index + 1);
    } else if (char === '[') {
      total = addSpecificity(total, [0, 1, 0]);
      index = closing(selector, index, ']') + 1;
    } else if (char === ':') {
      const element = selector[index + 1] === ':';
      const nameStart = index + (element ? 2 : 1);
      const nameEnd = readIdent(selector, nameStart);
      const name = selector.slice(nameStart, nameEnd).toLowerCase();
      const hasArgument = selector[nameEnd] === '(';
      const argumentEnd = hasArgument ? closing(selector, nameEnd, ')') : nameEnd - 1;
      const argument = hasArgument ? selector.slice(nameEnd + 1, argumentEnd) : null;
      total = addSpecificity(total, element ? [0, 0, 1] : pseudoClass(name, argument));
      index = argumentEnd + 1;
    } else if (/[a-z]/iu.test(char)) {
      total = addSpecificity(total, [0, 0, 1]);
      index = readIdent(selector, index);
    } else index += 1;
  }
  return total;
}

function layerRank(layer: string | null, layerOrder: readonly string[]): number {
  if (layer === null) return layerOrder.length;
  const rank = layerOrder.indexOf(layer.split('.')[0] ?? layer);
  return rank === -1 ? layerOrder.length : rank;
}

function cascadeOrder(
  entries: readonly CascadeEntry[],
  layerOrder: readonly string[],
): readonly CascadeEntry[] {
  return entries.toSorted(
    (left, right) =>
      layerRank(left.layer, layerOrder) - layerRank(right.layer, layerOrder) ||
      compareSpecificity(left.specificity, right.specificity) ||
      left.order - right.order,
  );
}

function varReference(value: string): string | null {
  return /^var\(\s*(--[\w-]+)\s*\)$/u.exec(value.trim())?.[1] ?? null;
}

function tokenChain(name: string, winner: (name: string) => CascadeEntry | null): TokenChain {
  const steps: TokenStep[] = [];
  let current: string | null = name;
  while (current !== null) {
    if (steps.length === CHAIN_LIMIT) return { steps, end: 'too-deep' };
    const entry = winner(current);
    if (entry === null) return { steps, end: 'missing' };
    steps.push({ name: current, entry });
    current = varReference(entry.value);
  }
  return { steps, end: 'value' };
}

function formatSpecificity(value: Specificity): string {
  return `(${value.join(', ')})`;
}

export {
  cascadeOrder,
  compareSpecificity,
  formatSpecificity,
  specificity,
  splitSelectorList,
  tokenChain,
  varReference,
};
export type { CascadeEntry, Specificity, TokenChain, TokenStep };
