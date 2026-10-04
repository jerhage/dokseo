import { build } from 'vite';
import type { Plugin, Rolldown } from 'vite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { BUNDLE_SAMPLES, ENTRY, bundleSample, shownCode } from './bundle-samples';
import type { BundleSample, BundledChunk } from './bundle-samples';

const BUNDLE_TIMEOUT_MS = 30_000;

function sampleModules(sample: BundleSample): Plugin {
  const sources = new Map(sample.files.map((file) => [file.name, file.code]));
  return {
    name: 'docs-bundle-sample',
    enforce: 'pre',
    resolveId(id) {
      const name = id.replace(/^\.\//u, '');
      if (!sources.has(name)) return null;
      return { id: name, moduleSideEffects: sample.sideEffectFree.includes(name) ? false : null };
    },
    load(id) {
      return sources.get(id) ?? null;
    },
  };
}

function chunksOf(output: Rolldown.RolldownOutput): readonly BundledChunk[] {
  return output.output.flatMap((item) =>
    item.type === 'chunk' ? [{ fileName: item.fileName, code: item.code }] : [],
  );
}

async function bundled(sample: BundleSample): Promise<readonly BundledChunk[]> {
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    plugins: [sampleModules(sample)],
    build: {
      write: false,
      minify: sample.minify,
      rolldownOptions: { input: ENTRY },
    },
  });
  const outputs = Array.isArray(result) ? result : [result];
  return outputs.flatMap((output) => ('output' in output ? chunksOf(output) : []));
}

describe('the bundle samples', () => {
  beforeAll(() => {
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it.each(BUNDLE_SAMPLES.map((sample) => [sample.id, sample] as const))(
    'records exactly what the installed Vite builds from %s',
    async (_id, sample) => {
      expect(await bundled(sample)).toEqual(sample.chunks);
    },
    BUNDLE_TIMEOUT_MS,
  );

  it('keeps the side effect of a barrel module that nothing names, and drops it when declared free of them', () => {
    expect(bundleSample('barrel').chunks[0]?.code).toContain('window.registry');
    expect(bundleSample('barrel-pure').chunks[0]?.code).not.toContain('window.registry');
  });
});

describe('shownCode', () => {
  it('leaves out the preload helper region and keeps the rest', () => {
    const chunk: BundledChunk = {
      fileName: 'a.js',
      code: '//#region a.js\nconsole.log(1);\n//#endregion\n//#region \\0vite/preload-helper.js\nvar x = 1;\n//#endregion\n//#region entry.js\nrun();\n//#endregion\n',
    };

    expect(shownCode(chunk)).toBe(
      '//#region a.js\nconsole.log(1);\n//#endregion\n//#region entry.js\nrun();\n//#endregion',
    );
  });
});
