import { describe, expect, it } from 'vitest';
import { createUnlock } from './unlock.svelte';

describe('createUnlock', () => {
  it('asks for the password at first', () => {
    expect(createUnlock().prompt).toEqual({ kind: 'asking' });
  });

  it('stops asking when dismissed and asks again on request', () => {
    const unlock = createUnlock();

    unlock.dismiss();
    expect(unlock.prompt).toEqual({ kind: 'dismissed' });
    unlock.ask();

    expect(unlock.prompt).toEqual({ kind: 'asking' });
  });
});
