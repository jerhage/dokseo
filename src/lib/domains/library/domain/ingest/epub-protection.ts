import { match } from 'ts-pattern';
import { attributeOf, descendantsNamed, parseXml } from './xml-document';

type BookProtection =
  | { readonly kind: 'unprotected' }
  | { readonly kind: 'obfuscated-fonts'; readonly algorithms: readonly string[] }
  | { readonly kind: 'rights-managed' }
  | { readonly kind: 'encrypted'; readonly algorithms: readonly string[] };

type ProtectionEvidence = {
  readonly entryNames: readonly string[];
  readonly encryptionXml: string | null;
};

const ENCRYPTION_ENTRY = 'META-INF/encryption.xml';

const RIGHTS_ENTRY = 'META-INF/rights.xml';

const FONT_OBFUSCATION: ReadonlySet<string> = new Set([
  'http://www.idpf.org/2008/embedding',
  'http://ns.adobe.com/pdf/enc#RC4SHA1',
]);

function holds(names: readonly string[], entry: string): boolean {
  const wanted = entry.toLowerCase();
  return names.some((name) => name.toLowerCase() === wanted);
}

function encryptionAlgorithms(xml: string): readonly string[] {
  const root = parseXml(xml);
  if (root === null) return [];
  const algorithms: string[] = [];
  for (const method of descendantsNamed(root, 'EncryptionMethod')) {
    const algorithm = attributeOf(method, 'Algorithm')?.trim();
    if (algorithm !== undefined && algorithm !== '') algorithms.push(algorithm);
  }
  return [...new Set(algorithms)];
}

function bookProtection(evidence: ProtectionEvidence): BookProtection {
  if (holds(evidence.entryNames, RIGHTS_ENTRY)) return { kind: 'rights-managed' };
  if (!holds(evidence.entryNames, ENCRYPTION_ENTRY)) return { kind: 'unprotected' };

  const xml = evidence.encryptionXml;
  const algorithms = xml === null ? [] : encryptionAlgorithms(xml);
  if (algorithms.length === 0) return { kind: 'encrypted', algorithms };

  const foreign = algorithms.filter((algorithm) => !FONT_OBFUSCATION.has(algorithm));
  if (foreign.length === 0) return { kind: 'obfuscated-fonts', algorithms };
  return { kind: 'encrypted', algorithms: foreign };
}

function blocksReading(protection: BookProtection): boolean {
  return match(protection)
    .with({ kind: 'unprotected' }, () => false)
    .with({ kind: 'obfuscated-fonts' }, () => false)
    .with({ kind: 'rights-managed' }, () => true)
    .with({ kind: 'encrypted' }, () => true)
    .exhaustive();
}

export { blocksReading, bookProtection, ENCRYPTION_ENTRY, RIGHTS_ENTRY };
export type { BookProtection, ProtectionEvidence };
