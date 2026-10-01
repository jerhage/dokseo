import { RememberedChoice } from '$lib/shared/remembered-choice.svelte';
import type { BookMatching } from '../domain/book/book-matching';
import { readBookMatching, saveBookMatching } from './book-matching-setting';

const chosen = new RememberedChoice<BookMatching>(readBookMatching, saveBookMatching);

function bookMatchingChosen(): BookMatching {
  return chosen.value;
}

function chooseBookMatching(matching: BookMatching): void {
  chosen.choose(matching);
}

export { bookMatchingChosen, chooseBookMatching };
