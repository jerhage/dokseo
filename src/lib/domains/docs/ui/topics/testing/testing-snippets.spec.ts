import { readFileSync } from 'node:fs';
import { compileModule } from 'svelte/compiler';
import { describe, expect, it } from 'vitest';
import {
  CLIENT_EFFECT,
  CLIENT_OUTPUT,
  RUNE_MODULE,
  SERVER_OUTPUT,
  TESTING_SNIPPETS,
} from './testing-snippets';

function unindented(code: string): string {
  return code
    .split('\n')
    .map((line) => line.trimStart())
    .join('\n');
}

function compiled(generate: 'server' | 'client'): string {
  return compileModule(RUNE_MODULE, { generate, filename: 'plan.svelte.js' }).js.code;
}

describe('the testing page snippets', () => {
  it.each(TESTING_SNIPPETS.map((snippet) => [snippet.label, snippet] as const))(
    'quotes %s exactly as the source file has it',
    (_label, snippet) => {
      const source = readFileSync(snippet.file, 'utf8');

      expect(unindented(source)).toContain(unindented(snippet.code));
    },
  );
});

describe('the compiled rune module', () => {
  it('drops the effect and the proxy from the server build', () => {
    const server = compiled('server');

    expect(server).toContain(SERVER_OUTPUT);
    expect(server).not.toContain('effect');
    expect(server).not.toContain('proxy');
  });

  it('keeps the proxy and the effect in the client build', () => {
    const client = compiled('client');

    expect(client).toContain(CLIENT_OUTPUT);
    expect(client).toContain(CLIENT_EFFECT);
  });
});
