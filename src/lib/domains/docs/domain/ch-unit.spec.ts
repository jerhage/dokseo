import { describe, expect, it } from 'vitest';
import {
  CH_FONTS,
  REFERENCE_CH,
  chFont,
  chPixels,
  charactersThatFit,
  fontLoadQuery,
  formatPixels,
  lengthIn,
  stackAtStage,
  zeroAdvanceOf,
} from './ch-unit';

describe('ch-unit', () => {
  it('multiplies the zero advance by the ch value', () => {
    expect(chPixels(10.07, 68)).toBeCloseTo(684.76, 2);
  });

  it('recovers the zero advance from a measured width', () => {
    expect(zeroAdvanceOf(685, 68)).toBeCloseTo(10.07, 2);
  });

  it('reports no advance for a zero ch value', () => {
    expect(zeroAdvanceOf(0, 0)).toBe(0);
  });

  it('records the zero advance the demo shows for each recorded width', () => {
    for (const font of CH_FONTS) {
      expect(formatPixels(font.zeroPixels)).toBe(
        formatPixels(zeroAdvanceOf(font.widthPixels, REFERENCE_CH)),
      );
    }
  });

  it('puts the Yorha column within two pixels of the base column', () => {
    const yorha = chFont('zen-kaku-gothic-new');
    const base = chFont('system-ui');
    expect(
      Math.abs(yorha.proseCh * (yorha.widthPixels / REFERENCE_CH) - base.widthPixels),
    ).toBeLessThan(2);
  });

  it('counts the average characters that fit in a box', () => {
    expect(charactersThatFit(600, 300, 60)).toBe(120);
  });

  it('counts none when the sample has no width', () => {
    expect(charactersThatFit(600, 0, 60)).toBe(0);
  });

  it('rounds pixels to one decimal', () => {
    expect(formatPixels(684.76)).toBe('684.8 px');
    expect(formatPixels(640)).toBe('640 px');
  });

  it('quotes the family in a font load query', () => {
    expect(fontLoadQuery('DM Sans', 16)).toBe('16px "DM Sans"');
  });

  it('drops the web font from the stack before it arrives', () => {
    const font = chFont('dm-sans');
    expect(stackAtStage(font, 'fallback')).toBe('system-ui, sans-serif');
    expect(stackAtStage(font, 'web-font')).toBe("'DM Sans', system-ui, sans-serif");
  });

  it('writes a length in the chosen unit', () => {
    expect(lengthIn('ic', 20)).toBe('20ic');
  });
});
