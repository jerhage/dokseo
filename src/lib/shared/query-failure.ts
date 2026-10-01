import { describeCause } from './cause';
import { logUnexpected } from './unexpected-failure';

class QueryFailure extends Error {
  override readonly name = 'QueryFailure';
}

function failureMessage(cause: unknown): string {
  if (cause instanceof QueryFailure) return cause.message;
  logUnexpected('query', cause);
  return `Something went wrong: ${describeCause(cause)}`;
}

export { QueryFailure, failureMessage };
