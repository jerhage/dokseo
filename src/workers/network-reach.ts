import type { Fetching } from './model-load-source';

const NEEDS_A_CONNECTION =
  'Downloading the model needs a network connection, and none could be reached';

type Explained = <T>(load: Promise<T>) => Promise<T>;

function explainUnreachable(env: { fetch: Fetching }): Explained {
  const direct = env.fetch;
  let unreachable = false;

  env.fetch = async (input, init) => {
    try {
      return await direct(input, init);
    } catch (cause) {
      if (cause instanceof TypeError) unreachable = true;
      throw cause;
    }
  };

  return async (load) => {
    try {
      return await load;
    } catch (cause) {
      if (!unreachable) throw cause;
      throw new Error(NEEDS_A_CONNECTION, { cause });
    }
  };
}

export { NEEDS_A_CONNECTION, explainUnreachable };
export type { Explained };
