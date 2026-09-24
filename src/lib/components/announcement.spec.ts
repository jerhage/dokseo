import { describe, expect, it } from 'vitest';
import { announcementRole } from './announcement';

describe('announcementRole', () => {
  it('interrupts for danger', () => {
    expect(announcementRole('danger')).toBe('alert');
  });

  it('waits its turn for every other variant', () => {
    expect([
      announcementRole('info'),
      announcementRole('success'),
      announcementRole('warning'),
    ]).toEqual(['status', 'status', 'status']);
  });
});
