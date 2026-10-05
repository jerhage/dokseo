import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SOURCE = new URL('../', import.meta.url);
const ICON_FOLDER = 'lib/ui/components/icons/';
const ICONS = new URL(ICON_FOLDER, SOURCE);
const BASE = 'Icon.svelte';
const PLAYGROUNDS = ['routes/playground/', 'lib/ui/playground/'];

function iconFiles(): readonly string[] {
  return readdirSync(ICONS)
    .filter((file) => file.endsWith('.svelte') && file !== BASE)
    .toSorted();
}

function sourceFiles(): readonly string[] {
  return readdirSync(SOURCE, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(fileURLToPath(SOURCE), join(entry.parentPath, entry.name)))
    .map((path) => path.split('\\').join('/'))
    .filter((path) => /\.(svelte|ts)$/u.test(path))
    .filter((path) => !path.endsWith('.spec.ts'))
    .filter((path) => !PLAYGROUNDS.some((folder) => path.startsWith(folder)))
    .filter((path) => !path.startsWith(ICON_FOLDER));
}

describe('the icon set Dokseo vendors', () => {
  it('ships only icons that a component, a domain or a screen imports', () => {
    const sources = sourceFiles().map((path) => readFileSync(new URL(path, SOURCE), 'utf8'));
    const unused = iconFiles().filter((file) => {
      const pattern = new RegExp(`icons/${file.replace('.', '\\.')}['"]`, 'u');
      return !sources.some((text) => pattern.test(text));
    });

    expect(iconFiles().length).toBeGreaterThan(0);
    expect(unused).toEqual([]);
  });
});
