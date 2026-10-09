import type { MatchStep } from './capture-card-rules';

function createCaptureSearch() {
  let query = $state('');
  let stepped = $state.raw<MatchStep | null>(null);

  const wanted = $derived(query.trim());

  return {
    get query(): string {
      return query;
    },
    get wanted(): string {
      return wanted;
    },
    get searching(): boolean {
      return wanted.length > 0;
    },
    get stepped(): MatchStep | null {
      return stepped;
    },
    setQuery(typed: string): void {
      query = typed;
    },
    stepTo(at: number): void {
      stepped = wanted.length > 0 ? { query: wanted, at } : null;
    },
  };
}

type CaptureSearchHook = ReturnType<typeof createCaptureSearch>;

export { createCaptureSearch };
export type { CaptureSearchHook };
