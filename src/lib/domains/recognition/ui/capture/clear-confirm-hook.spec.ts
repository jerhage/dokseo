import { describe, expect, it } from 'vitest';
import { createClearConfirm } from './clear-confirm.svelte';

describe('createClearConfirm', () => {
  it('asks for a confirmation, and drops it on dismiss', () => {
    const confirm = createClearConfirm();
    expect(confirm.confirming).toBe(false);

    confirm.ask();
    expect(confirm.confirming).toBe(true);

    confirm.dismiss();
    expect(confirm.confirming).toBe(false);
  });
});
