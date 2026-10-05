import { describe, expect, it } from 'vitest';
import { announcementRole } from './announcement';

describe('announcementRole', () => {
  it('interrupts for danger and waits its turn for every other variant', () => {
    expect([
      announcementRole('danger'),
      announcementRole('info'),
      announcementRole('success'),
      announcementRole('warning'),
    ]).toEqual(['alert', 'status', 'status', 'status']);
  });
});
