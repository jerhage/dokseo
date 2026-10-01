import { describe, expect, it } from 'vitest';
import { textAnchor } from '$lib/shared/anchor';
import { captureId, imageIndex } from '$lib/shared/ids';
import type { ArrivalCapture } from '../../domain/capture/capture-arrival';
import { passageArrivalFrom } from './capture-arrivals';

const CFI = 'epubcfi(/6/4!/4/2,/1:0,/1:2)';

const QUOTE = { exact: '灯台', prefix: '', suffix: '' };

const READ: readonly ArrivalCapture[] = [
  {
    id: captureId('here'),
    anchor: textAnchor(CFI, QUOTE, null),
    origin: 'lifted',
    text: '灯台',
    note: null,
  },
];

function byCfi(earlier: string, later: string): number {
  return earlier.localeCompare(later);
}

describe('passageArrivalFrom', () => {
  it('arrives at the lifted passage at the cfi a url names', () => {
    const arrival = passageArrivalFrom(READ, { kind: 'passage', cfi: CFI, query: null }, byCfi);

    expect(arrival?.at.id).toBe(captureId('here'));
  });

  it('arrives at no passage for a url naming an image or nothing', () => {
    expect(
      passageArrivalFrom(
        READ,
        { kind: 'image', index: imageIndex(0), region: null, query: null },
        byCfi,
      ),
    ).toBeNull();
    expect(passageArrivalFrom(READ, { kind: 'none' }, byCfi)).toBeNull();
  });
});
