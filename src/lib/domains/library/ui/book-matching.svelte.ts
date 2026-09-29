import type { BookMatching } from '../domain/book/book-matching';
import { readBookMatching, saveBookMatching } from './book-matching-setting';

let chosen = $state(readBookMatching());

function bookMatchingChosen(): BookMatching {
  return chosen;
}

function chooseBookMatching(matching: BookMatching): void {
  chosen = matching;
  saveBookMatching(matching);
}

export { bookMatchingChosen, chooseBookMatching };
