type PdfBuild = 'modern' | 'legacy';

const MODERN_BUILD_REQUIREMENTS = [
  'Map.prototype.getOrInsert',
  'Map.prototype.getOrInsertComputed',
  'WeakMap.prototype.getOrInsert',
  'WeakMap.prototype.getOrInsertComputed',
  'Promise.try',
  'Math.sumPrecise',
  'URL.parse',
  'Set.prototype.difference',
  'Set.prototype.intersection',
  'Set.prototype.isDisjointFrom',
  'Set.prototype.isSubsetOf',
  'Set.prototype.isSupersetOf',
  'Set.prototype.symmetricDifference',
  'Set.prototype.union',
  'Iterator',
  'Iterator.prototype.drop',
  'Iterator.prototype.every',
  'Iterator.prototype.filter',
  'Iterator.prototype.find',
  'Iterator.prototype.flatMap',
  'Iterator.prototype.forEach',
  'Iterator.prototype.map',
  'Iterator.prototype.some',
  'Iterator.prototype.take',
  'Iterator.prototype.toArray',
  'Uint8Array.fromBase64',
  'Uint8Array.prototype.setFromBase64',
  'Uint8Array.prototype.setFromHex',
  'Uint8Array.prototype.toBase64',
  'Uint8Array.prototype.toHex',
] as const;

type ModernBuildRequirement = (typeof MODERN_BUILD_REQUIREMENTS)[number];

function lookup(root: object, path: ModernBuildRequirement): unknown {
  let current: unknown = root;
  for (const key of path.split('.')) {
    if (current === null || (typeof current !== 'object' && typeof current !== 'function')) {
      return undefined;
    }
    current = Reflect.get(current, key);
  }
  return current;
}

function choosePdfBuild(globals: object): PdfBuild {
  const complete = MODERN_BUILD_REQUIREMENTS.every(
    (path) => typeof lookup(globals, path) === 'function',
  );
  return complete ? 'modern' : 'legacy';
}

export { MODERN_BUILD_REQUIREMENTS, choosePdfBuild };
export type { ModernBuildRequirement, PdfBuild };
