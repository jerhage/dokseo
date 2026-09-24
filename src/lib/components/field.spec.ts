import { describe, expect, it } from 'vitest';
import { fieldControl, fieldIds } from './field';

const IDS = fieldIds('f1');

describe('fieldIds', () => {
  it('derives a distinct id for the control, the hint and the error', () => {
    expect(new Set([IDS.control, IDS.hint, IDS.error]).size).toBe(3);
  });
});

describe('fieldControl', () => {
  it('gives the control the id the label points at', () => {
    expect(fieldControl(IDS, false, false).id).toBe(IDS.control);
  });

  it('describes a bare control by nothing', () => {
    expect(fieldControl(IDS, false, false)['aria-describedby']).toBeUndefined();
  });

  it('describes the control by its hint', () => {
    expect(fieldControl(IDS, true, false)['aria-describedby']).toBe(IDS.hint);
  });

  it('describes the control by its hint and then its error', () => {
    expect(fieldControl(IDS, true, true)['aria-describedby']).toBe(`${IDS.hint} ${IDS.error}`);
  });

  it('marks the control invalid only while an error shows', () => {
    expect([
      fieldControl(IDS, true, false)['aria-invalid'],
      fieldControl(IDS, false, true)['aria-invalid'],
    ]).toEqual([undefined, 'true']);
  });
});
