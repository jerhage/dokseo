import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import type { CompiledExample, CompilerFlag } from './compiled-example';
import { CONCEPT_EXAMPLES } from './concept-examples';

const EXAMPLE_FOLDER = join(process.cwd(), 'typescript-examples');

const COMPILE_TIMEOUT_MS = 60_000;

const COMPILED_EXAMPLES: readonly CompiledExample[] = CONCEPT_EXAMPLES;

function optionsFor(flags: readonly CompilerFlag[]): ts.CompilerOptions {
  return {
    strict: flags.includes('--strict'),
    noUncheckedIndexedAccess: flags.includes('--noUncheckedIndexedAccess'),
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    moduleDetection: ts.ModuleDetectionKind.Force,
    lib: ['lib.esnext.d.ts', 'lib.dom.d.ts'],
    types: [],
    noEmit: true,
    skipLibCheck: true,
  };
}

function examplePath(example: CompiledExample): string {
  return join(EXAMPLE_FOLDER, example.file);
}

function compiled(examples: readonly CompiledExample[]): ReadonlyMap<string, string> {
  const [first] = examples;
  if (first === undefined) return new Map();
  const options = optionsFor(first.flags);
  const sources = new Map(examples.map((example) => [examplePath(example), example.code]));
  const host = ts.createCompilerHost(options);
  const readFile = host.readFile.bind(host);
  const fileExists = host.fileExists.bind(host);
  const getSourceFile = host.getSourceFile.bind(host);
  host.readFile = (path) => sources.get(path) ?? readFile(path);
  host.fileExists = (path) => sources.has(path) || fileExists(path);
  host.getSourceFile = (path, language, onError, create) => {
    const code = sources.get(path);
    if (code === undefined) return getSourceFile(path, language, onError, create);
    return ts.createSourceFile(path, code, language);
  };
  const program = ts.createProgram([...sources.keys()], options, host);
  const format: ts.FormatDiagnosticsHost = {
    getCanonicalFileName: (path) => path,
    getCurrentDirectory: () => EXAMPLE_FOLDER,
    getNewLine: () => '\n',
  };
  return new Map(
    examples.map((example) => {
      const file = program.getSourceFile(examplePath(example));
      if (file === undefined) throw new Error(`${example.file} was not compiled`);
      const diagnostics = [
        ...program.getSyntacticDiagnostics(file),
        ...program.getSemanticDiagnostics(file),
      ];
      return [example.file, ts.formatDiagnostics(diagnostics, format).trimEnd()];
    }),
  );
}

function flagKey(example: CompiledExample): string {
  return example.flags.join(' ');
}

function compiledAll(): ReadonlyMap<string, string> {
  const groups = Map.groupBy(COMPILED_EXAMPLES, flagKey);
  return new Map(Array.from(groups.values()).flatMap((group) => Array.from(compiled(group))));
}

describe('the TypeScript page examples', () => {
  it('names every example file once', () => {
    const files = COMPILED_EXAMPLES.map((example) => example.file);

    expect(new Set(files).size).toBe(files.length);
  });

  it(
    'prints exactly the recorded errors when the installed TypeScript compiles each example',
    () => {
      const printed = compiledAll();

      expect(
        COMPILED_EXAMPLES.map((example) => ({
          file: example.file,
          errors: printed.get(example.file),
        })),
      ).toEqual(
        COMPILED_EXAMPLES.map((example) => ({ file: example.file, errors: example.errors })),
      );
    },
    COMPILE_TIMEOUT_MS,
  );
});
