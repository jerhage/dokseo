type OverflowLine<Item> = {
  readonly shown: readonly Item[];
  readonly hidden: readonly Item[];
};

function overflowLine<Item>(items: readonly Item[], room: number): OverflowLine<Item> {
  if (items.length <= room) return { shown: items, hidden: [] };

  const cut = Math.max(room - 1, 0);
  return { shown: items.slice(0, cut), hidden: items.slice(cut) };
}

function hiddenNames<Item>(hidden: readonly Item[], name: (item: Item) => string): string {
  return hidden.map(name).join(', ');
}

export { hiddenNames, overflowLine };
export type { OverflowLine };
