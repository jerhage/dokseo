import { announcementOf } from './read-paged-state';
import type { PagedReadState, PagedTexts } from './read-paged-state';

class PagedAnnouncer<Item, Failure> {
  #texts: PagedTexts<Failure>;
  #say: (text: string) => void;
  #spoken: string | null = null;

  constructor(texts: PagedTexts<Failure>, say: (text: string) => void) {
    this.#texts = texts;
    this.#say = say;
  }

  observe(state: PagedReadState<Item, Failure>): void {
    const text = announcementOf(state, this.#texts);
    if (text === null || text === this.#spoken) return;
    this.#spoken = text;
    this.#say(text);
  }
}

export { PagedAnnouncer };
