const SHELL_CACHE_PREFIX = 'reader-shell-';

const SHELL_STATIC_FILE = /\.(woff2|woff|svg|png|ico|webp|wasm|webmanifest)$/u;

function shellCacheName(version: string): string {
  return `${SHELL_CACHE_PREFIX}${version}`;
}

function isStaleShellCache(name: string, current: string): boolean {
  return name.startsWith(SHELL_CACHE_PREFIX) && name !== current;
}

function shellDocument(base: string): string {
  return `${base}/`;
}

function shellAssets(
  base: string,
  build: readonly string[],
  files: readonly string[],
): readonly string[] {
  return [shellDocument(base), ...build, ...files.filter((file) => SHELL_STATIC_FILE.test(file))];
}

export { SHELL_CACHE_PREFIX, isStaleShellCache, shellAssets, shellCacheName, shellDocument };
