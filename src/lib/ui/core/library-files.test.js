import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { pathToFileURL } from 'node:url';
import { SKIPPED_FOLDERS, filesUnder } from './library-files.js';

let root = '';

/**
 * @param {string} path
 * @param {string} contents
 */
function place(path, contents) {
  const file = join(root, path);
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, contents);
}

/** @returns {URL} */
function rootUrl() {
  return pathToFileURL(`${root}/`);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'library-files-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('filesUnder', () => {
  it('lists the files of the library tree with their relative paths, sorted', () => {
    place('fixtures/button/default.html', '<button></button>');
    place('root.html', '<div></div>');
    place('styles/index.css', '');

    assert.deepEqual(filesUnder(rootUrl(), ['.html']), [
      'fixtures/button/default.html',
      'root.html',
    ]);
  });

  it('skips a node_modules folder', () => {
    place('styles/index.css', '');
    place('node_modules/x/y.css', '');

    assert.deepEqual(filesUnder(rootUrl(), ['.css']), ['styles/index.css']);
  });

  it('skips every tool output folder and every dot folder, at any depth', () => {
    place('kept.css', '');
    for (const folder of [...SKIPPED_FOLDERS, '.git', '.cache']) {
      place(`${folder}/hidden.css`, '');
      place(`styles/${folder}/hidden.css`, '');
    }

    assert.deepEqual(filesUnder(rootUrl(), ['.css']), ['kept.css']);
  });
});
