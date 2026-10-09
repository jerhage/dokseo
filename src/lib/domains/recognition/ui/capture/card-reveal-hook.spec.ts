import { describe, expect, it } from 'vitest';
import { captureId } from '$lib/shared/ids';
import { createCardReveal } from './card-reveal';

describe('createCardReveal', () => {
  it('reveals the capture just made once, wherever it sits', () => {
    const reveal = createCardReveal();
    const made = captureId('c2');

    expect([reveal.reveals(made, made, true), reveal.reveals(made, made, true)]).toEqual([
      true,
      false,
    ]);
  });

  it('reveals a capture held while hidden once the panel shows', () => {
    const reveal = createCardReveal();
    const made = captureId('c2');

    expect([reveal.reveals(made, made, false), reveal.reveals(made, made, true)]).toEqual([
      false,
      true,
    ]);
  });
});
