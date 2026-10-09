import { describe, expect, it } from 'vitest';
import { createRemovalConfirm } from './removal-confirm.svelte';

describe('createRemovalConfirm', () => {
  it('asks only for a model that is stored, and drops the question on dismiss', () => {
    const confirm = createRemovalConfirm();

    confirm.ask(false);
    expect(confirm.confirming).toBe(false);

    confirm.ask(true);
    expect(confirm.confirming).toBe(true);

    confirm.dismiss();
    expect(confirm.confirming).toBe(false);
  });
});
