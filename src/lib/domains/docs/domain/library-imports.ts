import { match } from 'ts-pattern';

type ImportKind = 'package' | 'sibling' | 'parent' | 'alias';

type ImportTally = {
  readonly target: string;
  readonly kind: ImportKind;
  readonly files: number;
};

const SPECIFIER = /(?:\bfrom\s+|\bimport\s*\(?\s*)'([^']+)'|new URL\(\s*'(\.[^']*)'/gu;

function importSpecifiers(source: string): readonly string[] {
  const found = Array.from(source.matchAll(SPECIFIER), (hit) => hit[1] ?? hit[2] ?? '');
  return [...new Set(found)].filter((specifier) => specifier !== '');
}

function importKind(specifier: string): ImportKind {
  if (specifier.startsWith('./')) return 'sibling';
  if (specifier.startsWith('../')) return 'parent';
  if (specifier.startsWith('$')) return 'alias';
  return 'package';
}

function importTarget(specifier: string): string {
  return match(importKind(specifier))
    .with('sibling', () => './')
    .with('parent', () => specifier.replace(/[^/.][^/]*$/u, ''))
    .with('alias', () => specifier.split('/')[0] ?? specifier)
    .with('package', () => specifier)
    .exhaustive();
}

const KIND_ORDER: readonly ImportKind[] = ['package', 'sibling', 'parent', 'alias'];

function tallyImports(sources: readonly string[]): readonly ImportTally[] {
  const files = new Map<string, number>();
  for (const source of sources) {
    const targets = new Set(importSpecifiers(source).map(importTarget));
    for (const target of targets) files.set(target, (files.get(target) ?? 0) + 1);
  }
  return [...files]
    .map(([target, count]) => ({ target, kind: importKind(target), files: count }))
    .toSorted(
      (a, b) =>
        KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
        b.files - a.files ||
        a.target.localeCompare(b.target),
    );
}

function filesImporting(sources: readonly string[], kind: ImportKind): number {
  return sources.filter((source) =>
    importSpecifiers(source).some((specifier) => importKind(specifier) === kind),
  ).length;
}

export { filesImporting, importKind, importSpecifiers, importTarget, tallyImports };
export type { ImportKind, ImportTally };
