const NOTHING: ReadonlySet<string> = new Set();

function createSelection(
  initial: ReadonlySet<string> = NOTHING,
  onchange: (chosen: ReadonlySet<string>) => void = () => undefined,
) {
  let chosen = $state.raw<ReadonlySet<string>>(initial);

  function set(next: ReadonlySet<string>): void {
    chosen = next;
    onchange(next);
  }

  return {
    get chosen(): ReadonlySet<string> {
      return chosen;
    },
    toggle(entryId: string): void {
      const next = new Set(chosen);
      if (!next.delete(entryId)) next.add(entryId);
      set(next);
    },
    selectAll(entryIds: readonly string[]): void {
      set(new Set(entryIds));
    },
    clear(): void {
      set(NOTHING);
    },
    drop(entryId: string): void {
      if (!chosen.has(entryId)) return;
      const next = new Set(chosen);
      next.delete(entryId);
      set(next);
    },
  };
}

export { createSelection };
