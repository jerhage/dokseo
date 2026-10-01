import { describeCause } from './cause';
import type { Result } from './result';

class QueryFailure extends Error {
  override readonly name = 'QueryFailure';
}

function unwrap<T, E>(result: Result<T, E>, describe: (error: E) => string): T {
  if (!result.ok) throw new QueryFailure(describe(result.error), { cause: result.error });
  return result.value;
}

function failureMessage(cause: unknown): string {
  if (cause instanceof QueryFailure) return cause.message;
  return `Something went wrong: ${describeCause(cause)}`;
}

export { QueryFailure, failureMessage, unwrap };
