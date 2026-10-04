import { match } from 'ts-pattern';

type PolicyDirective = {
  readonly name: string;
  readonly sources: readonly string[];
};

type ContextReport = {
  readonly isolated: boolean;
  readonly evaluates: boolean;
};

type FrameObservation =
  | { readonly kind: 'timed-out' }
  | { readonly kind: 'loaded'; readonly documentText: string | null };

type FrameOutcome =
  | { readonly kind: 'readable'; readonly text: string }
  | { readonly kind: 'opaque' }
  | { readonly kind: 'no-load' };

const ONNX_MAX_DEFAULT_THREADS = 4;

function onnxDefaultThreads(isolated: boolean, cores: number): number {
  if (!isolated) return 1;
  return Math.min(ONNX_MAX_DEFAULT_THREADS, Math.ceil(Math.max(cores, 1) / 2));
}

function policyDirectives(header: string): readonly PolicyDirective[] {
  const seen = new Set<string>();
  const directives: PolicyDirective[] = [];
  for (const part of header.split(';')) {
    const [rawName, ...sources] = part.trim().split(/\s+/u);
    const name = (rawName ?? '').toLowerCase();
    if (name === '' || seen.has(name)) continue;
    seen.add(name);
    directives.push({ name, sources });
  }
  return directives;
}

function contextReport(data: unknown): ContextReport | null {
  if (typeof data !== 'object' || data === null) return null;
  if (!('isolated' in data) || !('evaluates' in data)) return null;
  const { isolated, evaluates } = data;
  if (typeof isolated !== 'boolean' || typeof evaluates !== 'boolean') return null;
  return { isolated, evaluates };
}

function frameOutcome(observation: FrameObservation): FrameOutcome {
  return match(observation)
    .with({ kind: 'timed-out' }, (): FrameOutcome => ({ kind: 'no-load' }))
    .with({ kind: 'loaded', documentText: null }, (): FrameOutcome => ({ kind: 'opaque' }))
    .with({ kind: 'loaded' }, ({ documentText }): FrameOutcome => ({
      kind: 'readable',
      text: documentText ?? '',
    }))
    .exhaustive();
}

export {
  ONNX_MAX_DEFAULT_THREADS,
  contextReport,
  frameOutcome,
  onnxDefaultThreads,
  policyDirectives,
};
export type { ContextReport, FrameObservation, FrameOutcome, PolicyDirective };
