const REQUEST_TIMEOUT = 408;

const TOO_MANY_REQUESTS = 429;

const FIRST_SERVER_ERROR = 500;

const NO_EXPECTED_STATUS: readonly number[] = [];

class HttpError extends Error {
  override readonly name = 'HttpError';
  readonly status: number;
  readonly method: string;
  readonly url: string;

  constructor(status: number, method: string, url: string) {
    super(`${method} ${url} answered ${status}`);
    this.status = status;
    this.method = method;
    this.url = url;
  }
}

function checkedResponse(
  response: Response,
  method: string,
  url: string,
  expected: readonly number[] = NO_EXPECTED_STATUS,
): Response {
  if (response.ok || expected.includes(response.status)) return response;
  throw new HttpError(response.status, method, url);
}

function isTransient(error: unknown): boolean {
  if (error instanceof HttpError) {
    return (
      error.status >= FIRST_SERVER_ERROR ||
      error.status === REQUEST_TIMEOUT ||
      error.status === TOO_MANY_REQUESTS
    );
  }
  return error instanceof TypeError;
}

export { HttpError, checkedResponse, isTransient };
