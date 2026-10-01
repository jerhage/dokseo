import { QueryObserver } from '@tanstack/svelte-query';
import type {
  DefaultError,
  QueryClient,
  QueryKey,
  QueryObserverOptions,
  QueryObserverResult,
} from '@tanstack/svelte-query';
import { readStateOf } from '../read-state';
import type { ReadState } from '../read-state';

function observedRead<T, K extends QueryKey>(
  client: QueryClient,
  options: QueryObserverOptions<T, DefaultError, T, T, K>,
): Promise<ReadState<T>> {
  const observer = new QueryObserver(client, options);

  return new Promise((resolve) => {
    let unsubscribe = (): void => undefined;
    const settle = (result: QueryObserverResult<T>): void => {
      if (result.fetchStatus === 'fetching') return;
      unsubscribe();
      resolve(readStateOf(result));
    };
    unsubscribe = observer.subscribe(settle);
    settle(observer.getCurrentResult());
  });
}

export { observedRead };
