import { LOADING_FEED } from './catalog-feed-read';
import type { CatalogFeedRead } from './catalog-feed-read';

type ReadFeed = () => CatalogFeedRead;

const READ_NOTHING: ReadFeed = () => LOADING_FEED;

class CatalogFeedBinding {
  #read = $state.raw<ReadFeed>(READ_NOTHING);

  get current(): CatalogFeedRead {
    return this.#read();
  }

  bind(read: ReadFeed): () => void {
    this.#read = read;
    return () => {
      if (this.#read === read) this.#read = READ_NOTHING;
    };
  }
}

export { CatalogFeedBinding };
export type { ReadFeed };
