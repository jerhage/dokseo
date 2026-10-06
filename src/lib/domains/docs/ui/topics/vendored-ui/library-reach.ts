import type { ImportTally } from '../../../domain/library-imports';

type LibraryFiles = 'source' | 'specs' | 'styleSpecs';

type LibraryReach = {
  readonly files: number;
  readonly aliased: number;
  readonly above: number;
  readonly tallies: readonly ImportTally[];
};

const LIBRARY_FOLDER = 'src/lib/ui/components';

const STYLES_FOLDER = 'src/lib/ui/core/styles';

const FONT_FACES_FILE = 'src/lib/ui/core/styles/base/fonts.css';

const ABSOLUTE_FONT_URLS = 0;

const RELATIVE_FONT_URLS = 28;

const LIBRARY_REACH: Readonly<Record<LibraryFiles, LibraryReach>> = {
  source: {
    files: 167,
    aliased: 0,
    above: 7,
    tallies: [
      { target: 'svelte/elements', kind: 'package', files: 67 },
      { target: 'svelte', kind: 'package', files: 38 },
      { target: 'ts-pattern', kind: 'package', files: 24 },
      { target: 'svelte/attachments', kind: 'package', files: 4 },
      { target: 'svelte/reactivity', kind: 'package', files: 1 },
      { target: './', kind: 'sibling', files: 112 },
      { target: '../core/', kind: 'parent', files: 7 },
    ],
  },
  specs: {
    files: 60,
    aliased: 0,
    above: 2,
    tallies: [
      { target: 'vitest', kind: 'package', files: 60 },
      { target: 'svelte/server', kind: 'package', files: 24 },
      { target: 'svelte', kind: 'package', files: 23 },
      { target: 'node:fs', kind: 'package', files: 2 },
      { target: './', kind: 'sibling', files: 60 },
      { target: '../', kind: 'parent', files: 1 },
      { target: '../../core/icons/', kind: 'parent', files: 1 },
      { target: '../../scripts/', kind: 'parent', files: 1 },
      { target: '../core/', kind: 'parent', files: 1 },
      { target: '../core/styles/', kind: 'parent', files: 1 },
    ],
  },
  styleSpecs: {
    files: 2,
    aliased: 0,
    above: 2,
    tallies: [
      { target: 'node:assert/strict', kind: 'package', files: 2 },
      { target: 'node:fs', kind: 'package', files: 2 },
      { target: 'node:test', kind: 'package', files: 2 },
      { target: './', kind: 'sibling', files: 1 },
      { target: '../', kind: 'parent', files: 2 },
    ],
  },
};

export {
  ABSOLUTE_FONT_URLS,
  FONT_FACES_FILE,
  LIBRARY_FOLDER,
  LIBRARY_REACH,
  RELATIVE_FONT_URLS,
  STYLES_FOLDER,
};
export type { LibraryFiles, LibraryReach };
