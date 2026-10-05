import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SKIPPED_FOLDERS, filesUnder } from './library-files';

const STYLED = '<div></div>\n<style>\n  div { color: red; }\n</style>\n';

let root = '';

function place(path: string, contents: string): void {
  const file = join(root, path);
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, contents);
}

function rootUrl(): URL {
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
    place('components/Button.svelte', '<button></button>');
    place('Root.svelte', '<div></div>');
    place('styles/index.css', '');

    expect(filesUnder(rootUrl(), ['.svelte'])).toEqual(['Root.svelte', 'components/Button.svelte']);
  });

  it('skips a node_modules folder, so a package Svelte file with a <style> block is not listed', () => {
    place('components/Button.svelte', '<button></button>');
    place('node_modules/x/y.svelte', STYLED);

    expect(filesUnder(rootUrl(), ['.svelte'])).toEqual(['components/Button.svelte']);
  });

  it('skips every tool output folder and every dot folder, at any depth', () => {
    place('kept.css', '');
    for (const folder of [...SKIPPED_FOLDERS, '.git', '.svelte-kit', '.cache']) {
      place(`${folder}/hidden.css`, '');
      place(`components/${folder}/hidden.css`, '');
    }

    expect(filesUnder(rootUrl(), ['.css'])).toEqual(['kept.css']);
  });
});
