import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKIPPED_FOLDERS: ReadonlySet<string> = new Set(['node_modules', 'build', 'dist', 'coverage']);

function isSkippedFolder(name: string): boolean {
  return name.startsWith('.') || SKIPPED_FOLDERS.has(name);
}

function walk(folder: string, prefix: string): readonly string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = `${prefix}${entry.name}`;
    if (entry.isDirectory()) {
      return isSkippedFolder(entry.name) ? [] : walk(join(folder, entry.name), `${path}/`);
    }
    return entry.isFile() ? [path] : [];
  });
}

function filesUnder(root: URL, extensions: readonly string[]): readonly string[] {
  return walk(fileURLToPath(root), '')
    .filter((path) => extensions.some((extension) => path.endsWith(extension)))
    .toSorted();
}

export { SKIPPED_FOLDERS, filesUnder };
