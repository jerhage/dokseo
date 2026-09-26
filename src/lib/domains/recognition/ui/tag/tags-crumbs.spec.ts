import { describe, expect, it } from 'vitest';
import { tagsCrumbs } from './tags-crumbs';

describe('tagsCrumbs', () => {
  it('leads from the library to the tags', () => {
    expect(tagsCrumbs('tags')).toEqual([{ label: 'Library', href: '/' }, { label: 'Tags' }]);
  });

  it('leads from the library through the tags to managing them', () => {
    expect(tagsCrumbs('manage')).toEqual([
      { label: 'Library', href: '/' },
      { label: 'Tags', href: '/tags' },
      { label: 'Manage' },
    ]);
  });
});
