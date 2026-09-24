import { match } from 'ts-pattern';

type FileLike = { readonly name: string; readonly type: string; readonly size: number };

type AcceptRule =
  | { readonly kind: 'extension'; readonly extension: string }
  | { readonly kind: 'family'; readonly prefix: string }
  | { readonly kind: 'type'; readonly type: string };

type Rejection =
  | { readonly kind: 'too-large'; readonly limit: number }
  | { readonly kind: 'wrong-type' }
  | { readonly kind: 'too-many' };

type FileVerdict =
  | { readonly kind: 'accepted' }
  | Exclude<Rejection, { readonly kind: 'too-many' }>;

type ArrivalVerdict = { readonly kind: 'accepted' } | Rejection;

type SelectionPolicy = {
  readonly rules: readonly AcceptRule[];
  readonly maxSize: number | undefined;
  readonly multiple: boolean;
};

type RejectedFile<F extends FileLike> = { readonly file: F; readonly reason: Rejection };

type ArrivedFile<F extends FileLike> = { readonly file: F; readonly verdict: ArrivalVerdict };

type FileSelection<F extends FileLike> = {
  readonly accepted: readonly F[];
  readonly rejected: readonly RejectedFile<F>[];
  readonly arrived: readonly ArrivedFile<F>[];
};

const KILOBYTE = 1024;
const MEGABYTE = KILOBYTE * KILOBYTE;

function acceptRule(entry: string): AcceptRule {
  if (entry.startsWith('.')) return { kind: 'extension', extension: entry };
  if (entry.endsWith('/*')) return { kind: 'family', prefix: entry.slice(0, -1) };
  return { kind: 'type', type: entry };
}

function acceptRules(accept: string | undefined): readonly AcceptRule[] {
  return (accept ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry !== '')
    .map(acceptRule);
}

function matchesRule(file: FileLike, rule: AcceptRule): boolean {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return match(rule)
    .with({ kind: 'extension' }, ({ extension }) => name.endsWith(extension))
    .with({ kind: 'family' }, ({ prefix }) => type.startsWith(prefix))
    .with({ kind: 'type' }, (exact) => type === exact.type)
    .exhaustive();
}

function fileVerdict(file: FileLike, policy: SelectionPolicy): FileVerdict {
  if (policy.maxSize !== undefined && file.size > policy.maxSize) {
    return { kind: 'too-large', limit: policy.maxSize };
  }
  if (policy.rules.length > 0 && !policy.rules.some((rule) => matchesRule(file, rule))) {
    return { kind: 'wrong-type' };
  }
  return { kind: 'accepted' };
}

function arrivalVerdict(
  file: FileLike,
  policy: SelectionPolicy,
  acceptedSoFar: number,
): ArrivalVerdict {
  const verdict = fileVerdict(file, policy);
  if (verdict.kind === 'accepted' && !policy.multiple && acceptedSoFar > 0) {
    return { kind: 'too-many' };
  }
  return verdict;
}

function selectFiles<F extends FileLike>(
  files: readonly F[],
  policy: SelectionPolicy,
): FileSelection<F> {
  const accepted: F[] = [];
  const rejected: RejectedFile<F>[] = [];
  const arrived: ArrivedFile<F>[] = [];
  for (const file of files) {
    const verdict = arrivalVerdict(file, policy, accepted.length);
    arrived.push({ file, verdict });
    if (verdict.kind === 'accepted') accepted.push(file);
    else rejected.push({ file, reason: verdict });
  }
  return { accepted, rejected, arrived };
}

function formatFileSize(bytes: number): string {
  if (bytes < KILOBYTE) return `${bytes} B`;
  const kilobytes = (bytes / KILOBYTE).toFixed(1);
  if (Number(kilobytes) < KILOBYTE) return `${kilobytes} KB`;
  return `${(bytes / MEGABYTE).toFixed(1)} MB`;
}

function describeRejection(reason: Rejection): string {
  return match(reason)
    .with({ kind: 'too-large' }, ({ limit }) => `Larger than ${formatFileSize(limit)}`)
    .with({ kind: 'wrong-type' }, () => 'File type not allowed')
    .with({ kind: 'too-many' }, () => 'Only one file at a time')
    .exhaustive();
}

export { acceptRules, describeRejection, fileVerdict, formatFileSize, selectFiles };
export type {
  AcceptRule,
  ArrivalVerdict,
  ArrivedFile,
  FileLike,
  FileSelection,
  FileVerdict,
  RejectedFile,
  Rejection,
  SelectionPolicy,
};
