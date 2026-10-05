import { compileModule } from 'svelte/compiler';
import { describe, expect, it } from 'vitest';
import { checkSnippets } from '../snippet-checks';
import * as quotes from './testing-snippets';
import { CLIENT_EFFECT, CLIENT_OUTPUT, RUNE_MODULE, SERVER_OUTPUT } from './testing-snippets';

function compiled(generate: 'server' | 'client'): string {
  return compileModule(RUNE_MODULE, { generate, filename: 'plan.svelte.js' }).js.code;
}

checkSnippets('the testing page snippets', quotes.TESTING_SNIPPETS, quotes);

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
