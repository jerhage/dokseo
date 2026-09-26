import { describe, expect, it } from 'vitest';
import { tagId } from '$lib/shared/ids';
import { namedTag } from '../../domain/tag/tag';
import { captureCount, manageNotice, manageRows } from './manage-rows';

const SFX = namedTag(tagId('sfx'), 'sfx', 'slate', 1);

const KEIGO = namedTag(tagId('keigo'), 'keigo', 'clay', 2);

describe('manageRows', () => {
  it('keeps the order and gives each tag the warning for its count', () => {
    expect(
      manageRows([
        { tag: SFX, count: 0 },
        { tag: KEIGO, count: 3 },
      ]),
    ).toEqual([
      {
        id: SFX.id,
        tag: SFX,
        count: 0,
        warning: 'Delete sfx? Nothing carries it, so no capture changes.',
      },
      {
        id: KEIGO.id,
        tag: KEIGO,
        count: 3,
        warning: 'Delete keigo? 3 captures lose the tag. The captures themselves are kept.',
      },
    ]);
  });
});

describe('manageNotice', () => {
  it('shows nothing once there are rows', () => {
    expect(manageNotice(2, 'loading')).toBeNull();
  });

  it('reports loading before the tags arrive', () => {
    expect(manageNotice(0, 'idle')).toBe('Reading your tags…');
    expect(manageNotice(0, 'loading')).toBe('Reading your tags…');
  });

  it('reports no tags once the load settles or fails', () => {
    const none = 'No tags yet. Tag a capture in the reader and it appears here.';

    expect(manageNotice(0, 'ready')).toBe(none);
    expect(manageNotice(0, 'failed')).toBe(none);
  });
});

describe('captureCount', () => {
  it('counts captures in the singular and the plural', () => {
    expect(captureCount(1)).toBe('1 capture');
    expect(captureCount(0)).toBe('0 captures');
  });
});
