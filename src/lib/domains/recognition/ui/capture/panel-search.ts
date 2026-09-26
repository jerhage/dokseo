type SearchSteps = {
  readonly tally: string;
  readonly previous: boolean;
  readonly next: boolean;
};

function searchTally(cursor: number, shown: number, total: number): string {
  return cursor < 0 ? `${shown} of ${total} matched` : `match ${cursor + 1} of ${shown}`;
}

function searchSteps(cursor: number, shown: number, total: number): SearchSteps {
  return {
    tally: searchTally(cursor, shown, total),
    previous: cursor > 0,
    next: cursor + 1 < shown,
  };
}

export { searchSteps };
export type { SearchSteps };
