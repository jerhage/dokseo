import { contentHash } from '../ids';
import type { ContentHash } from '../ids';

const KEY_LENGTH = 32;

function bookKey(name: string): ContentHash {
  const hex = Array.from(name, (letter) => letter.charCodeAt(0).toString(16).padStart(2, '0'));
  return contentHash(hex.join('').padEnd(KEY_LENGTH, '0').slice(0, KEY_LENGTH));
}

export { bookKey };
