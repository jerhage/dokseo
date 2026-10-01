import { describe, expect, it } from 'vitest';
import { RememberedChoice } from './remembered-choice.svelte';

describe('RememberedChoice', () => {
  it('starts from what the reader answers', () => {
    const choice = new RememberedChoice(
      () => 'grid',
      () => undefined,
    );

    expect(choice.value).toBe('grid');
  });

  it('reads the store once, when it is built', () => {
    let reads = 0;
    const choice = new RememberedChoice(
      () => {
        reads += 1;
        return 'grid';
      },
      () => undefined,
    );

    void choice.value;
    void choice.value;

    expect(reads).toBe(1);
  });

  it('holds and saves the value it is told to choose', () => {
    const saved: string[] = [];
    const choice = new RememberedChoice(
      () => 'grid',
      (value: string) => {
        saved.push(value);
      },
    );

    choice.choose('list');

    expect(choice.value).toBe('list');
    expect(saved).toEqual(['list']);
  });
});
