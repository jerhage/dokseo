import { describeCause } from './cause';

class QueryFailure extends Error {
  override readonly name = 'QueryFailure';
}

function failureMessage(cause: unknown): string {
  if (cause instanceof QueryFailure) return cause.message;
  return `Something went wrong: ${describeCause(cause)}`;
}

export { QueryFailure, failureMessage };
