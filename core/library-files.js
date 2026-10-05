import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {ReadonlySet<string>} */
const SKIPPED_FOLDERS = new Set(['node_modules', 'build', 'dist', 'coverage']);

/**
 * @param {string} name
 * @returns {boolean}
 */
function isSkippedFolder(name) {
  return name.startsWith('.') || SKIPPED_FOLDERS.has(name);
}

/**
 * @param {string} folder
 * @param {string} prefix
 * @returns {readonly string[]}
 */
function walk(folder, prefix) {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = `${prefix}${entry.name}`;
    if (entry.isDirectory()) {
      return isSkippedFolder(entry.name) ? [] : walk(join(folder, entry.name), `${path}/`);
    }
    return entry.isFile() ? [path] : [];
  });
}

/**
 * @param {URL} root
 * @param {readonly string[]} extensions
 * @returns {readonly string[]}
 */
function filesUnder(root, extensions) {
  return walk(fileURLToPath(root), '')
    .filter((path) => extensions.some((extension) => path.endsWith(extension)))
    .toSorted();
}

export { SKIPPED_FOLDERS, filesUnder };
