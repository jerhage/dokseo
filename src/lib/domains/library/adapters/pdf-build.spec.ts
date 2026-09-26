import { describe, expect, it } from 'vitest';
import { MODERN_BUILD_REQUIREMENTS, choosePdfBuild } from './pdf-build';
import type { ModernBuildRequirement } from './pdf-build';

function isHolder(value: unknown): value is object {
  return typeof value === 'function' || (typeof value === 'object' && value !== null);
}

function place(root: object, path: ModernBuildRequirement): void {
  const keys = path.split('.');
  const name = keys.pop();
  if (name === undefined) throw new Error(`${path} names nothing`);
  let node = root;
  for (const key of keys) {
    const existing: unknown = Reflect.get(node, key);
    if (isHolder(existing)) {
      node = existing;
      continue;
    }
    const created = {};
    Reflect.set(node, key, created);
    node = created;
  }
  if (!isHolder(Reflect.get(node, name))) Reflect.set(node, name, () => undefined);
}

function globalsWithout(missing: ModernBuildRequirement | undefined): object {
  const root = {};
  for (const path of MODERN_BUILD_REQUIREMENTS) {
    if (path !== missing) place(root, path);
  }
  return root;
}

describe('choosePdfBuild', () => {
  it('chooses the modern build when every API it needs is present', () => {
    expect(choosePdfBuild(globalsWithout(undefined))).toBe('modern');
  });

  it.each(MODERN_BUILD_REQUIREMENTS)('chooses the legacy build when %s is missing', (missing) => {
    expect(choosePdfBuild(globalsWithout(missing))).toBe('legacy');
  });

  it('chooses the legacy build when a holder of the API is missing entirely', () => {
    const globals = globalsWithout(undefined);
    Reflect.deleteProperty(globals, 'Iterator');
    expect(choosePdfBuild(globals)).toBe('legacy');
  });

  it('chooses the legacy build when an API is present but is not a function', () => {
    const globals = globalsWithout('Promise.try');
    Reflect.set(globals, 'Promise', { try: true });
    expect(choosePdfBuild(globals)).toBe('legacy');
  });
});
