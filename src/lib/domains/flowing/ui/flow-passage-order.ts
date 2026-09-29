import { compare } from 'foliate-js/epubcfi.js';

function comparePassages(earlier: string, later: string): number {
  return compare(earlier, later);
}

export { comparePassages };
