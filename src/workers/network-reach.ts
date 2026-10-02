import type { Fetching } from './model-load-source';

const NEEDS_A_CONNECTION =
  'Downloading the model needs a network connection, and none could be reached';

type Explained = <T>(load: Promise<T>) => Promise<T>;

function requestUrl(input: string | URL): string {
  return typeof input === 'string' ? input : input.href;
}

function explainUnreachable(env: { fetch: Fetching }): Explained {
  const direct = env.fetch;
  let unreachable: string | null = null;

  env.fetch = async (input, init) => {
    try {
      return await direct(input, init);
    } catch (cause) {
      if (cause instanceof TypeError && unreachable === null) {
        unreachable = `${requestUrl(input)} failed with ${cause.message}`;
      }
      throw cause;
    }
  };

  return async (load) => {
    try {
      return await load;
    } catch (cause) {
      if (unreachable === null) throw cause;
      const reason = cause instanceof Error ? cause.message : String(cause);
      throw new Error(`${NEEDS_A_CONNECTION} (${unreachable}; the load failed with ${reason})`, {
        cause,
      });
    }
  };
}

export { NEEDS_A_CONNECTION, explainUnreachable };
export type { Explained };
