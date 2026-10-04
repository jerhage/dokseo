import { describe, expect, it } from 'vitest';
import {
  contextReport,
  frameOutcome,
  onnxDefaultThreads,
  policyDirectives,
} from './security-headers';

describe('policyDirectives', () => {
  it('splits a header into directives and their sources', () => {
    expect(
      policyDirectives("default-src 'none'; frame-src blob:; img-src 'self' blob: data:"),
    ).toEqual([
      { name: 'default-src', sources: ["'none'"] },
      { name: 'frame-src', sources: ['blob:'] },
      { name: 'img-src', sources: ["'self'", 'blob:', 'data:'] },
    ]);
  });

  it('keeps the first of two directives with one name, as a browser does', () => {
    expect(policyDirectives("script-src 'self'; Script-Src 'unsafe-eval'")).toEqual([
      { name: 'script-src', sources: ["'self'"] },
    ]);
  });

  it('skips empty parts and surrounding space', () => {
    expect(policyDirectives("  ; frame-ancestors   'self' ;; ")).toEqual([
      { name: 'frame-ancestors', sources: ["'self'"] },
    ]);
  });

  it('answers nothing for an empty header', () => {
    expect(policyDirectives('')).toEqual([]);
  });
});

describe('contextReport', () => {
  it('reads a report posted by a probe', () => {
    expect(contextReport({ isolated: true, evaluates: false })).toEqual({
      isolated: true,
      evaluates: false,
    });
  });

  it.each([null, 'isolated', { isolated: true }, { isolated: 'yes', evaluates: true }])(
    'rejects %j',
    (data) => {
      expect(contextReport(data)).toBeNull();
    },
  );
});

describe('frameOutcome', () => {
  it('reports a frame that never loaded', () => {
    expect(frameOutcome({ kind: 'timed-out' })).toEqual({ kind: 'no-load' });
  });

  it('reports a loaded frame whose document cannot be read as opaque', () => {
    expect(frameOutcome({ kind: 'loaded', documentText: null })).toEqual({ kind: 'opaque' });
  });

  it('passes on the text of a frame it can read', () => {
    expect(frameOutcome({ kind: 'loaded', documentText: 'did not run' })).toEqual({
      kind: 'readable',
      text: 'did not run',
    });
  });
});

describe('onnxDefaultThreads', () => {
  it('runs on one thread without isolation, however many cores there are', () => {
    expect(onnxDefaultThreads(false, 16)).toBe(1);
  });

  it.each([
    { cores: 1, threads: 1 },
    { cores: 2, threads: 1 },
    { cores: 3, threads: 2 },
    { cores: 6, threads: 3 },
    { cores: 8, threads: 4 },
    { cores: 16, threads: 4 },
  ])('uses $threads threads on $cores cores when isolated', ({ cores, threads }) => {
    expect(onnxDefaultThreads(true, cores)).toBe(threads);
  });

  it('treats an unreported core count as one core', () => {
    expect(onnxDefaultThreads(true, 0)).toBe(1);
  });
});
